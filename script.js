var map = undefined;

//MAP
const MAPSIZE = 16;
const CUBESIZE = 32;

//VISUAL
const FOGSTARTMODIFIER = 100;
const FOGINTENSITY = 2;
const HEIGHTTOWIDTH = 48;
const FOV = 60 * toRad;
const TEXTURESIZE = 32;

// Graphics intensive
const MAXDOF = 6;
const RAYAMOUNT = canvas.width;
const SIDERES = 1;

// Constants of constants
const MAXDIST = MAXDOF * CUBESIZE;
const TEXTURETOCUBE = TEXTURESIZE / CUBESIZE;

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
                c.fillStyle = this.wall[x + y * MAPSIZE] == Object.values(images.textures)[0] ? "black" : "white";
                if (detectCollision(x * CUBESIZE + 1, y * CUBESIZE + 1, CUBESIZE - 2, CUBESIZE - 2, mouse.x, mouse.y, 1, 1)) {
                    c.fillStyle = "gray"
                    if (mouse.down) {
                        mouse.down = false;
                        this.wall[x + y * MAPSIZE] = this.wall[x + y * MAPSIZE] == 0 ? Object.values(images.textures)[0] : 0;
                    }
                }
                c.fillRect(x * CUBESIZE + 1, y * CUBESIZE + 1, CUBESIZE - 2, CUBESIZE - 2)
            }
        }
    }
    drawRay() {
        let rays = [];

        const DRAWHEIGHT = canvas.height;
        const DRAWWIDTH = canvas.width;
        const PITCH = ~~(player.pitch);

        for (let index = 0; index < RAYAMOUNT; index++) {
            let angle = (player.angle - FOV / 2) + index * FOV / RAYAMOUNT;
            let newAngle = (angle > Math.PI * 2 ? angle - Math.PI * 2 : (angle < 0 ? angle + Math.PI * 2 : angle))
            let ray = player.getRay(newAngle);
            rays.push(ray)

            let lineWidth = DRAWWIDTH / RAYAMOUNT;
            let lineX = ~~(index * lineWidth);
            ray.distance = Math.min(ray.distance, MAXDIST)
            let raFix = Math.cos(player.angle - newAngle)
            ray.distance *= raFix

            let lineHeight = ~~((DRAWHEIGHT * HEIGHTTOWIDTH / ray.distance))
            let lineOffset = DRAWHEIGHT / 2 - lineHeight / 2;
            let texX;
            if (ray.side == 0) {
                texX = Math.abs(~~(ray.x * (TEXTURETOCUBE) + 1)) % TEXTURESIZE;
                if (newAngle > Math.PI) texX = TEXTURESIZE - texX - 1;
            } else {
                texX = Math.abs(~~(ray.y * (TEXTURETOCUBE) + 1)) % TEXTURESIZE;
                if (newAngle < Math.PI / 2 || newAngle > Math.PI * 3 / 2) texX = TEXTURESIZE - texX - 1;
            }
            const WALLPIXELHEIGHT = lineHeight / TEXTURESIZE;
            const CEILEDWALLPIXELHEIGHT = Math.ceil(WALLPIXELHEIGHT)
            const FLOOREDLINEOFFSET = ~~(lineOffset);
            const FLOOREDLINEWIDTH = ~~(lineWidth);
            for (let y = 0; y < TEXTURESIZE; y++) {
                let colStart = getWholeImageDataFromSpriteSheet(ray.tex, texX, y);
                let fog = -(ray.distance - MAXDIST + FOGSTARTMODIFIER) * FOGINTENSITY
                if (fog < -255) fog = -255;
                if (fog > 0) fog = 0;

                for (let drawX = 0; drawX < lineWidth; drawX++) {
                    for (let drawY = 0; drawY < CEILEDWALLPIXELHEIGHT; drawY++) {
                        let dataIndex = (lineX + drawX + (FLOOREDLINEOFFSET + ~~(WALLPIXELHEIGHT * y) + PITCH + drawY) * DRAWWIDTH) * 4
                        for (let i = 0; i < 4; i++) {
                            frameBuffer.data[dataIndex + i] = (i < 3 ? fog : 0) + images.imageData.data[colStart + i];
                        }
                    }
                }
            }
            const FLOORROOFMULTIPLIER = (256 / 60 * renderScale) * HEIGHTTOWIDTH * TEXTURETOCUBE / raFix;
            let upper = ~~(lineOffset + lineHeight + PITCH)
            for (let y = upper; y < DRAWHEIGHT; y += SIDERES) {
                let dy = y - DRAWHEIGHT / 2 - PITCH
                let multiplier = FLOORROOFMULTIPLIER / dy;
                let tmpX = Math.cos(newAngle) * multiplier;
                let tmpY = Math.sin(newAngle) * multiplier;
                let texX = Math.abs(~~(player.x * (TEXTURETOCUBE) + tmpX));
                let texY = Math.abs(~~(player.y * (TEXTURETOCUBE) + tmpY));

                let texIndex = ~~(texX / CUBESIZE) + ~~(texY / CUBESIZE) * MAPSIZE;
                let tex = this.floor[texIndex]
                let colStart = getWholeImageDataFromSpriteSheet(tex, texX % TEXTURESIZE, texY % TEXTURESIZE)
                let fogDist = distance(0, 0, Math.abs(tmpX), Math.abs(tmpY));
                let fog = -(FOGSTARTMODIFIER * 1.5 - MAXDIST + fogDist)
                if (fog < -255) fog = -255;
                if (fog > 0) fog = 0;

                for (let drawX = 0; drawX < FLOOREDLINEWIDTH; drawX++) {
                    for (let drawY = 0; drawY < SIDERES; drawY++) {
                        let dataIndex = (lineX + drawX + (y + drawY) * DRAWWIDTH) * 4
                        for (let i = 0; i < 4; i++) {
                            frameBuffer.data[dataIndex + i] = (i < 3 ? fog : 0) + images.imageData.data[colStart + i];
                        }
                    }
                }
            }
            upper = lineOffset + PITCH;
            for (let y = 0; y < upper; y += SIDERES) {

                let dy = y - DRAWHEIGHT / 2 - PITCH
                let multiplier = FLOORROOFMULTIPLIER / dy;
                let tmpX = Math.cos(newAngle) * multiplier;
                let tmpY = Math.sin(newAngle) * multiplier;
                let texX = Math.abs(~~(-player.x * (32 / CUBESIZE) + tmpX));
                let texY = Math.abs(~~(-player.y * (32 / CUBESIZE) + tmpY));

                let texIndex = ~~(texX / CUBESIZE) + ~~(texY / CUBESIZE) * MAPSIZE
                let tex = this.roof[texIndex]
                let colStart = getWholeImageDataFromSpriteSheet(tex, texX % TEXTURESIZE, texY % TEXTURESIZE)
                let fogDist = distance(0, 0, Math.abs(tmpX), Math.abs(tmpY));
                let fog = -(FOGSTARTMODIFIER * 1.5 - MAXDIST + fogDist)
                if (fog < -255) fog = -255;
                if (fog > 0) fog = 0;
                for (let drawX = 0; drawX < FLOOREDLINEWIDTH; drawX++) {
                    for (let drawY = 0; drawY < SIDERES; drawY++) {
                        let dataIndex = (lineX + drawX + (y + drawY) * DRAWWIDTH) * 4
                        for (let i = 0; i < 4; i++) {
                            frameBuffer.data[dataIndex + i] = (i < 3 ? fog : 0) + images.imageData.data[colStart + i];
                        }
                    }
                }
            }
        }
        c.putImageData(frameBuffer, 0, 0)
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
            this.deltaA = Math.cos(fixAngle(this.angle - Math.PI / 2));
            this.deltaB = Math.sin(fixAngle(this.angle - Math.PI / 2));
        }
        if (pressedKeys['KeyW']) {
            if (!map.wall[~~((this.x + this.deltaX * deltaTime * 10) / CUBESIZE) + ~~((this.y + this.deltaY * deltaTime * 10) / CUBESIZE) * MAPSIZE]) {
                this.x += this.deltaX * deltaTime;
                this.y += this.deltaY * deltaTime;
            }
        }
        if (pressedKeys['KeyS']) {
            if (!map.wall[~~((this.x - this.deltaX * deltaTime * 10) / CUBESIZE) + ~~((this.y - this.deltaY * deltaTime * 10) / CUBESIZE) * MAPSIZE]) {
                this.x -= this.deltaX * deltaTime;
                this.y -= this.deltaY * deltaTime;
            }
        }
        if (pressedKeys['KeyD']) {
            if (!map.wall[~~((this.x - this.deltaA * deltaTime * 10) / CUBESIZE) + ~~((this.y - this.deltaB * deltaTime * 10) / CUBESIZE) * MAPSIZE]) {
                this.x -= this.deltaA * deltaTime;
                this.y -= this.deltaB * deltaTime;
            }
        }
        if (pressedKeys['KeyA']) {
            if (!map.wall[~~((this.x + this.deltaA * deltaTime * 10) / CUBESIZE) + ~~((this.y + this.deltaB * deltaTime * 10) / CUBESIZE) * MAPSIZE]) {
                this.x += this.deltaA * deltaTime;
                this.y += this.deltaB * deltaTime;
            }
        }
        if (pressedKeys['ArrowUp']) {
            this.pitch += renderScale / 4 * deltaTime;
            this.pitch = this.pitch.clamp(-renderScale * 8, renderScale * 8)
        }
        if (pressedKeys['ArrowDown']) {
            this.pitch -= renderScale / 4 * deltaTime;
            this.pitch = this.pitch.clamp(-renderScale * 8, renderScale * 8)
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
                rayY = ~~(this.y / CUBESIZE) * CUBESIZE - 0.0001;
                rayX = (this.y - rayY) * aTan + this.x;
                rayOffseyY = -CUBESIZE;
                rayOffseyX = -rayOffseyY * aTan;
            }
            if (angle < Math.PI) {
                rayY = ~~(this.y / CUBESIZE) * CUBESIZE + CUBESIZE;
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
                mapX = ~~(rayX / CUBESIZE)
                mapY = ~~(rayY / CUBESIZE)
                mapIndex = mapX + mapY * MAPSIZE;
                if (mapIndex >= 0 && mapIndex < Math.pow(MAPSIZE, 2) && map.wall[mapIndex] != 0) { maxed = true } else {
                    rayX += rayOffseyX;
                    rayY += rayOffseyY;
                    dof++;
                };
            }
            return { x: rayX, y: rayY, side: 0, tex: map.wall[mapIndex] || { x: 1, y: 1, w: 32, h: 32 }, dof: dof }
        }
    }
    getVerticalRay(angle) {
        let nTan, rayX, rayY, rayOffseyX, rayOffseyY, dof = 0, mapX, mapY, mapIndex, maxed;
        for (let rayIndex = 0; rayIndex < 1; rayIndex++) {
            nTan = -Math.tan(angle)
            if (angle > Math.PI / 2 && angle < Math.PI * 3 / 2) {
                rayX = ~~(this.x / CUBESIZE) * CUBESIZE - 0.0001;
                rayY = (this.x - rayX) * nTan + this.y;
                rayOffseyX = -CUBESIZE;
                rayOffseyY = -rayOffseyX * nTan;
            }
            if (angle < Math.PI / 2 || angle > Math.PI * 3 / 2) {
                rayX = ~~(this.x / CUBESIZE) * CUBESIZE + CUBESIZE;
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
                mapX = ~~(rayX / CUBESIZE)
                mapY = ~~(rayY / CUBESIZE)
                mapIndex = mapX + mapY * MAPSIZE;
                if (mapIndex >= 0 && mapIndex < Math.pow(MAPSIZE, 2) && map.wall[mapIndex] != 0) { maxed = true } else {
                    rayX += rayOffseyX;
                    rayY += rayOffseyY;
                    dof++;
                };
            }
            return { x: rayX, y: rayY, side: 1, tex: map.wall[mapIndex] || { x: 1, y: 1, w: 32, h: 32 }, dof: dof }
        }
    }
}

init();
