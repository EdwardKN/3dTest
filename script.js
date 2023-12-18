var map = undefined;

//MAP
const MAPSIZE = 16;
const CUBESIZE = 32;

//VISUAL
const FOGSTARTMODIFIER = 50;
const FOGINTENSITY = 10;
const HEIGHTTOWIDTH = 48;
const FOV = 60 * toRad;
const TEXTURESIZE = 32;

// Graphics intensive
const MAXDOF = 4;
const RAYAMOUNT = 80;
const SIDERES = 4;

var player = undefined;


async function init() {
    await loadData();
    map = new Map(MAPSIZE, CUBESIZE);
    player = new Player(100, 100)
    setTimeout(() => {
        update();
    }, 1000);
}

function update() {
    requestAnimationFrame(update);

    renderC.clearRect(0, 0, renderCanvas.width, renderCanvas.height)
    c.clearRect(0, 0, canvas.width, canvas.height);

    map.draw();
    player.update();

    c.drawText(fps, 20, 80, 20)

    renderC.drawImage(canvas, 0, 0, renderCanvas.width, renderCanvas.height);
}
class Map {
    constructor() {
        this.roof = [];
        this.wall = [];
        this.floor = [];
        this.init()
    }
    init() {
        for (let x = 0; x < MAPSIZE; x++) {
            for (let y = 0; y < MAPSIZE; y++) {
                this.roof.push(Object.values(images.textures)[0])
                this.wall.push((x == 0 || y == 0 || x == MAPSIZE - 1 || y == MAPSIZE - 1) ? Object.values(images.textures)[0] : 0)
                this.floor.push(Object.values(images.textures)[1])
            }
        }
    }
    draw() {
        this.drawRay();
    }
    drawMapEditor() {
        for (let x = 0; x < MAPSIZE; x++) {
            for (let y = 0; y < MAPSIZE; y++) {
                c.fillStyle = this.floor[x + y * MAPSIZE] == Object.values(images.textures)[0] ? "black" : "white";
                if (detectCollision(x * CUBESIZE + 1, y * CUBESIZE + 1, CUBESIZE - 2, CUBESIZE - 2, mouse.x, mouse.y, 1, 1)) {
                    c.fillStyle = "gray"
                    if (mouse.down) {
                        mouse.down = false;
                        this.floor[x + y * MAPSIZE] = this.floor[x + y * MAPSIZE] == Object.values(images.textures)[0] ? Object.values(images.textures)[1] : Object.values(images.textures)[0]
                    }
                }
                c.fillRect(x * CUBESIZE + 1, y * CUBESIZE + 1, CUBESIZE - 2, CUBESIZE - 2)
            }
        }
    }
    drawRay() {
        let rays = [];
        for (let index = 0; index <= RAYAMOUNT; index++) {
            let angle = (player.angle - FOV / 2) + index * FOV / RAYAMOUNT;
            let newAngle = (angle > Math.PI * 2 ? angle - Math.PI * 2 : (angle < 0 ? angle + Math.PI * 2 : angle))
            let ray = player.getRay(newAngle);
            rays.push(ray)

            let lineWidth = canvas.width / RAYAMOUNT;
            let lineX = index * lineWidth;

            ray.distance *= Math.cos(player.angle - newAngle)
            let lineHeight = Math.floor((canvas.height * HEIGHTTOWIDTH / ray.distance))
            let lineOffset = canvas.height / 2 - lineHeight / 2;
            let texX;
            if (ray.side == 0) {
                texX = Math.abs(Math.floor(ray.x * (TEXTURESIZE / CUBESIZE) + 1)) % TEXTURESIZE;
                if (newAngle > Math.PI) texX = TEXTURESIZE - texX;
            } else {
                texX = Math.abs(Math.floor(ray.y * (TEXTURESIZE / CUBESIZE) + 1)) % TEXTURESIZE;
                if (newAngle < Math.PI / 2 || newAngle > Math.PI * 3 / 2) texX = TEXTURESIZE - texX;
            }
            for (let y = 0; y < TEXTURESIZE; y++) {
                let col = getImageDataFromSpriteSheet(ray.tex, texX, y, false)
                let fog = -((ray.distance - MAXDOF * CUBESIZE + FOGSTARTMODIFIER) * FOGINTENSITY).clamp(0, 255)
                c.fillStyle = rgb(col[0] + fog, col[1] + fog, col[2] + fog);
                c.fillRect(Math.floor(lineX), Math.floor(lineOffset + y * (lineHeight / TEXTURESIZE) + player.pitch), Math.floor(lineWidth), Math.ceil(lineHeight / TEXTURESIZE))
            }
            for (let y = Math.floor(lineOffset + lineHeight + player.pitch); y < canvas.height; y += SIDERES) {
                let dy = y - canvas.height / 2 - player.pitch
                let raFix = Math.cos(fixAngle(player.angle - newAngle));
                let tmpX = Math.cos(newAngle) * 256 * HEIGHTTOWIDTH * (TEXTURESIZE / CUBESIZE) / dy / raFix;
                let tmpY = Math.sin(newAngle) * 256 * HEIGHTTOWIDTH * (TEXTURESIZE / CUBESIZE) / dy / raFix;
                texX = Math.abs(Math.floor(player.x * (TEXTURESIZE / CUBESIZE) + tmpX));
                let texY = Math.abs(Math.floor(player.y * (TEXTURESIZE / CUBESIZE) + tmpY));

                let tex = this.floor[Math.floor(texX / CUBESIZE) + Math.floor(texY / CUBESIZE) * MAPSIZE]
                let col = getImageDataFromSpriteSheet(tex, texX % TEXTURESIZE, texY % TEXTURESIZE, false)
                let fog = Math.floor(-Math.max(((Math.abs(tmpX) - MAXDOF * CUBESIZE + FOGSTARTMODIFIER) * FOGINTENSITY).clamp(0, 255), ((Math.abs(tmpY) - MAXDOF * CUBESIZE + FOGSTARTMODIFIER) * FOGINTENSITY)).clamp(0, 255))
                c.fillStyle = rgb(col[0] + fog, col[1] + fog, col[2] + fog);
                c.fillRect(Math.floor(lineX), y, Math.floor(lineWidth), SIDERES)
            }
            for (let y = 0; y < lineOffset + player.pitch; y += SIDERES) {

                let dy = y - canvas.height / 2 - player.pitch
                let raFix = Math.cos(fixAngle(player.angle - newAngle));
                let tmpX = Math.cos(newAngle) * 256 * HEIGHTTOWIDTH * (32 / CUBESIZE) / dy / raFix;
                let tmpY = Math.sin(newAngle) * 256 * HEIGHTTOWIDTH * (32 / CUBESIZE) / dy / raFix;
                texX = Math.abs(Math.floor(-player.x * (32 / CUBESIZE) + tmpX));
                let texY = Math.abs(Math.floor(-player.y * (32 / CUBESIZE) + tmpY));

                let tex = this.roof[Math.floor(texX / CUBESIZE) + Math.floor(texY / CUBESIZE) * MAPSIZE]
                let col = getImageDataFromSpriteSheet(tex, texX % TEXTURESIZE, texY % TEXTURESIZE, false)
                let fog = -Math.max(((Math.abs(tmpX) - MAXDOF * CUBESIZE + FOGSTARTMODIFIER) * FOGINTENSITY).clamp(0, 255), ((Math.abs(tmpY) - MAXDOF * CUBESIZE + FOGSTARTMODIFIER) * FOGINTENSITY)).clamp(0, 255)
                c.fillStyle = rgb(col[0] + fog, col[1] + fog, col[2] + fog);
                c.fillRect(Math.floor(lineX), y, Math.floor(lineWidth), SIDERES);
            }
        }
        //Mapeditor
        /*
        this.drawMapEditor()
        rays.forEach(ray => {
            c.drawLine({ from: player, to: { x: ray.x, y: ray.y, color: "black" }, lineWidth: 2 })
        })*/
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = 0.001;
        this.deltaX = 1;
        this.deltaY = 0;
        this.deltaA = 0;
        this.deltaB = -1;
        this.pitch = 0;
    }
    update() {
        if (pressedKeys['ArrowLeft']) {
            this.angle -= 0.02 * deltaTime;
            if (this.angle < 0) { this.angle += 2 * Math.PI }
            this.deltaX = Math.cos(this.angle);
            this.deltaY = Math.sin(this.angle);
            this.deltaA = Math.cos(fixAngle(this.angle - Math.PI / 2));
            this.deltaB = Math.sin(fixAngle(this.angle - Math.PI / 2));
        }
        if (pressedKeys['ArrowRight']) {
            this.angle += 0.02 * deltaTime;
            if (this.angle > 2 * Math.PI) { this.angle -= 2 * Math.PI }
            this.deltaX = Math.cos(this.angle);
            this.deltaY = Math.sin(this.angle);
        }
        if (pressedKeys['KeyW']) {
            if (!map.wall[Math.floor((this.x + this.deltaX * deltaTime) / CUBESIZE) + Math.floor((this.y + this.deltaY * deltaTime) / CUBESIZE) * MAPSIZE]) {
                this.x += this.deltaX * deltaTime;
                this.y += this.deltaY * deltaTime;
            }
        }
        if (pressedKeys['KeyS']) {
            if (!map.wall[Math.floor((this.x - this.deltaX * deltaTime) / CUBESIZE) + Math.floor((this.y - this.deltaY * deltaTime) / CUBESIZE) * MAPSIZE]) {
                this.x -= this.deltaX * deltaTime;
                this.y -= this.deltaY * deltaTime;
            }
        }
        if (pressedKeys['KeyD']) {
            if (!map.wall[Math.floor((this.x - this.deltaA * deltaTime) / CUBESIZE) + Math.floor((this.y - this.deltaB * deltaTime) / CUBESIZE) * MAPSIZE]) {
                this.x -= this.deltaA * deltaTime;
                this.y -= this.deltaB * deltaTime;
            }
        }
        if (pressedKeys['KeyA']) {
            if (!map.wall[Math.floor((this.x + this.deltaA * deltaTime) / CUBESIZE) + Math.floor((this.y + this.deltaB * deltaTime) / CUBESIZE) * MAPSIZE]) {
                this.x += this.deltaA * deltaTime;
                this.y += this.deltaB * deltaTime;
            }
        }
        if (pressedKeys['ArrowUp']) {
            this.pitch += 15 * deltaTime;
            this.pitch = this.pitch.clamp(-250, 250)
        }
        if (pressedKeys['ArrowDown']) {
            this.pitch -= 15 * deltaTime;
            this.pitch = this.pitch.clamp(-250, 250)
        }
        this.draw();
    }
    draw() {
        //c.fillRect(this.x - 2, this.y - 2, 4, 4)
        //c.drawLine({ from: this, to: { x: this.x + this.deltaX * 20, y: this.y + this.deltaY * 20 } })
    }
    getRay(angle) {
        let horizontalRay = this.getHorizontalRay(angle);
        let verticalRay = this.getVerticalRay(angle);

        horizontalRay.distance = distance(this.x, this.y, horizontalRay.x, horizontalRay.y);
        verticalRay.distance = distance(this.x, this.y, verticalRay.x, verticalRay.y);

        if (verticalRay.distance > horizontalRay.distance) {
            return horizontalRay
        } else {
            return verticalRay
        }
    }
    getHorizontalRay(angle) {
        let aTan, rayX, rayY, rayOffseyX, rayOffseyY, dof = 0, mapX, mapY, mapIndex, maxed;
        for (let rayIndex = 0; rayIndex < 1; rayIndex++) {
            aTan = -1 / Math.tan(angle)
            if (angle > Math.PI) {
                rayY = Math.floor(this.y / CUBESIZE) * CUBESIZE - 0.0001;
                rayX = (this.y - rayY) * aTan + this.x;
                rayOffseyY = -CUBESIZE;
                rayOffseyX = -rayOffseyY * aTan;
            }
            if (angle < Math.PI) {
                rayY = Math.floor(this.y / CUBESIZE) * CUBESIZE + CUBESIZE;
                rayX = (this.y - rayY) * aTan + this.x;
                rayOffseyY = CUBESIZE;
                rayOffseyX = -rayOffseyY * aTan;
            }
            if (angle == 0 || angle == Math.PI) {
                rayX = this.x;
                rayY = this.y;
                dof = MAXDOF;
            }
            while (dof < MAXDOF && !maxed) {
                mapX = Math.floor(rayX / CUBESIZE)
                mapY = Math.floor(rayY / CUBESIZE)
                mapIndex = mapX + mapY * MAPSIZE;
                if (mapIndex >= 0 && mapIndex < Math.pow(MAPSIZE, 2) && map.wall[mapIndex] != 0) { maxed = true } else {
                    rayX += rayOffseyX;
                    rayY += rayOffseyY;
                    dof++;
                };
            }
            return { x: rayX, y: rayY, side: 0, tex: map.wall[mapIndex] || { x: 0, y: 0, w: 32, h: 32 }, dof: dof }
        }
    }
    getVerticalRay(angle) {
        let nTan, rayX, rayY, rayOffseyX, rayOffseyY, dof = 0, mapX, mapY, mapIndex, maxed;
        for (let rayIndex = 0; rayIndex < 1; rayIndex++) {
            nTan = -Math.tan(angle)
            if (angle > Math.PI / 2 && angle < Math.PI * 3 / 2) {
                rayX = Math.floor(this.x / CUBESIZE) * CUBESIZE - 0.0001;
                rayY = (this.x - rayX) * nTan + this.y;
                rayOffseyX = -CUBESIZE;
                rayOffseyY = -rayOffseyX * nTan;
            }
            if (angle < Math.PI / 2 || angle > Math.PI * 3 / 2) {
                rayX = Math.floor(this.x / CUBESIZE) * CUBESIZE + CUBESIZE;
                rayY = (this.x - rayX) * nTan + this.y;
                rayOffseyX = CUBESIZE;
                rayOffseyY = -rayOffseyX * nTan;
            }
            if (angle == Math.PI / 2 || angle == Math.PI * 3 / 2) {
                rayX = this.x;
                rayY = this.y;
                dof = MAXDOF;
            }
            while (dof < MAXDOF && !maxed) {
                mapX = Math.floor(rayX / CUBESIZE)
                mapY = Math.floor(rayY / CUBESIZE)
                mapIndex = mapX + mapY * MAPSIZE;
                if (mapIndex >= 0 && mapIndex < Math.pow(MAPSIZE, 2) && map.wall[mapIndex] != 0) { maxed = true } else {
                    rayX += rayOffseyX;
                    rayY += rayOffseyY;
                    dof++;
                };
            }
            return { x: rayX, y: rayY, side: 1, tex: map.wall[mapIndex] || { x: 0, y: 0, w: 32, h: 32 }, dof: dof }
        }
    }
}

init();