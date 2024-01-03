var map = undefined;

//MAP
const MAPSIZE = 16;
const CUBESIZE = 32;

//VISUAL
const AMBIENTLIGHT = -130;
const HEIGHTTOWIDTH = 48;
const FOV = 60 * TORAD;
const TEXTURESIZE = 128;

// Graphics intensive
const MAXDOF = 30;
const RAYAMOUNT = canvas.width;
const SIDERES = 1;

// Constants of constants
const MAXDIST = MAXDOF * CUBESIZE;
const TEXTURETOCUBE = TEXTURESIZE / CUBESIZE;
const MAXMAPINDEX = Math.pow(MAPSIZE, 2);

const EDITORSCALE = 0.1;

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

    renderC.imageSmoothingEnabled = false;

    renderC.clearRect(0, 0, renderCanvas.width, renderCanvas.height)
    c.clearRect(0, 0, canvas.width, canvas.height);

    map.draw();
    player.update();

    c.drawText(fps, 20, 80, 20)

    renderC.drawImage(canvas, 0, 0, renderCanvas.width, renderCanvas.height);

}
class Light {
    constructor(x, y, strength) {
        this.x = x;
        this.y = y;
        this.strength = strength;
    }

    rayTrace(x, y) {
        let minDist = distance(x, y, this.x * CUBESIZE + CUBESIZE / 2, this.y * CUBESIZE + CUBESIZE / 2);

        if (minDist > this.strength * CUBESIZE) {
            return 0;
        }
        let degree = fixAngle(angleFromPoints(x, y, this.x * CUBESIZE + CUBESIZE / 2, this.y * CUBESIZE + CUBESIZE / 2) + 0.0001);
        let ray = getRay({ x: x - Math.cos(degree), y: y - Math.sin(degree) }, degree, this.strength, true)

        return ray.distance < minDist ? 0 : Math.max(0, this.strength * CUBESIZE - Math.min(ray.distance, minDist))
    }
}
class Map {
    constructor() {
        this.roof = [];
        this.wall = [];
        this.floor = [];
        this.lights = [];
        this.init()
    }
    init() {
        for (let x = 0; x < MAPSIZE; x++) {
            for (let y = 0; y < MAPSIZE; y++) {
                this.roof.push(Object.values(images.textures)[0])
                this.wall.push((x == 0 || y == 0 || x == MAPSIZE - 1 || y == MAPSIZE - 1) ? Object.values(images.textures)[0] : 0)
                this.floor.push(Object.values(images.textures)[0])
            }
        }
    }
    draw() {
        this.drawRay();
    }
    drawMapEditor() {
        c.fillStyle = "red"
        c.fillRect(MAPSIZE * CUBESIZE * EDITORSCALE, 0, MAPSIZE * CUBESIZE * EDITORSCALE, MAPSIZE * CUBESIZE * EDITORSCALE)
        for (let x = 0; x < MAPSIZE; x++) {
            for (let y = 0; y < MAPSIZE; y++) {
                c.fillStyle = this.wall[x + y * MAPSIZE] == Object.values(images.textures)[0] ? "black" : "white";
                if (detectCollision(MAPSIZE * CUBESIZE * EDITORSCALE + x * CUBESIZE * EDITORSCALE + 1, y * CUBESIZE * EDITORSCALE + 1, CUBESIZE * EDITORSCALE - 2, CUBESIZE * EDITORSCALE - 2, mouse.x, mouse.y, 1, 1)) {
                    c.fillStyle = "gray"
                    if (mouse.down) {
                        mouse.down = false;
                        this.wall[x + y * MAPSIZE] = this.wall[x + y * MAPSIZE] == Object.values(images.textures)[0] ? 0 : Object.values(images.textures)[0];
                    }
                }
                c.fillRect(MAPSIZE * CUBESIZE * EDITORSCALE + x * CUBESIZE * EDITORSCALE + 1, y * CUBESIZE * EDITORSCALE + 1, CUBESIZE * EDITORSCALE - 2, CUBESIZE * EDITORSCALE - 2)
            }
        }
    }
    drawLightEditor() {
        for (let x = 0; x < MAPSIZE; x++) {
            for (let y = 0; y < MAPSIZE; y++) {
                let thisLight = this.lights.filter(e => (e.x == x && e.y == y));
                c.fillStyle = thisLight.length ? "red" : "white";
                if (detectCollision(x * CUBESIZE * EDITORSCALE + 1, y * CUBESIZE * EDITORSCALE + 1, CUBESIZE * EDITORSCALE - 2, CUBESIZE * EDITORSCALE - 2, mouse.x, mouse.y, 1, 1)) {
                    c.fillStyle = "gray"
                    if (mouse.down) {
                        mouse.down = false;
                        if (thisLight.length) {
                            this.lights.splice(this.lights.indexOf(thisLight[0]), 1)
                        } else {
                            this.lights.push(new Light(x, y, 4))
                        }
                    }
                }
                c.fillRect(x * CUBESIZE * EDITORSCALE + 1, y * CUBESIZE * EDITORSCALE + 1, CUBESIZE * EDITORSCALE - 2, CUBESIZE * EDITORSCALE - 2)
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
            let ray = getRay(player, newAngle);
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
                texX = Math.abs(~~(ray.x * (TEXTURETOCUBE))) % TEXTURESIZE;
                if (newAngle > Math.PI) texX = TEXTURESIZE - texX - 1;
            } else {
                texX = Math.abs(~~(ray.y * (TEXTURETOCUBE))) % TEXTURESIZE;
                if (newAngle < Math.PI / 2 || newAngle > Math.PI * 3 / 2) texX = TEXTURESIZE - texX - 1;
            }
            const WALLPIXELHEIGHT = lineHeight / TEXTURESIZE;
            const CEILEDWALLPIXELHEIGHT = Math.ceil(WALLPIXELHEIGHT)
            const FLOOREDLINEOFFSET = ~~(lineOffset);
            const FLOOREDLINEWIDTH = ~~(lineWidth);
            
            let light = AMBIENTLIGHT;
            this.lights.forEach(lightSource => {
                light += lightSource.rayTrace(ray.x, ray.y)
            })
            if (light < -255) light = -255;
            if (light > 0) light = 0;

            for (let y = 0; y < TEXTURESIZE; y++) {
                let colStart = getWholeImageDataFromSpriteSheet(ray.tex, texX, y);
                for (let drawX = 0; drawX < lineWidth; drawX++) {
                    for (let drawY = 0; drawY < CEILEDWALLPIXELHEIGHT; drawY++) {
                        let dataIndex = (lineX + drawX + (FLOOREDLINEOFFSET + ~~(WALLPIXELHEIGHT * y) + PITCH + drawY) * DRAWWIDTH) * 4
                        for (let i = 0; i < 4; i++) {
                            frameBuffer.data[dataIndex + i] = (i < 3 ? light : 0) + images.imageData.data[colStart + i];
                        }
                    }
                }
            }
            const FLOORROOFMULTIPLIER = (256 / 56 * RENDERSCALE) * HEIGHTTOWIDTH * TEXTURETOCUBE / raFix;
            let upper = ~~(lineOffset + lineHeight + PITCH)
            for (let y = upper; y < DRAWHEIGHT; y += SIDERES) {
                let dy = y - DRAWHEIGHT / 2 - PITCH
                let multiplier = FLOORROOFMULTIPLIER / dy;
                let tmpX = Math.cos(newAngle) * multiplier;
                let tmpY = Math.sin(newAngle) * multiplier;
                let texX = Math.abs(~~(player.x * (TEXTURETOCUBE) + tmpX));
                let texY = Math.abs(~~(player.y * (TEXTURETOCUBE) + tmpY));

                let texIndex = Math.min(~~(texX / TEXTURESIZE) + ~~(texY / TEXTURESIZE) * MAPSIZE, MAXMAPINDEX - 1);
                let tex = this.floor[texIndex]
                let colStart = getWholeImageDataFromSpriteSheet(tex, texX % TEXTURESIZE, texY % TEXTURESIZE)
                let light = AMBIENTLIGHT;
                this.lights.forEach(lightSource => {
                    light += lightSource.rayTrace(texX / TEXTURETOCUBE, texY / TEXTURETOCUBE)

                })
                if (light < -255) light = -255;
                if (light > 0) light = 0;

                for (let drawX = 0; drawX < FLOOREDLINEWIDTH; drawX++) {
                    for (let drawY = 0; drawY < SIDERES; drawY++) {
                        let dataIndex = (lineX + drawX + (y + drawY) * DRAWWIDTH) * 4
                        for (let i = 0; i < 4; i++) {
                            frameBuffer.data[dataIndex + i] = (i < 3 ? light : 0) + images.imageData.data[colStart + i];
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
                let texX = Math.abs(~~(-player.x * (TEXTURETOCUBE) + tmpX));
                let texY = Math.abs(~~(-player.y * (TEXTURETOCUBE) + tmpY));

                let texIndex = ~~(texX / TEXTURESIZE) + ~~(texY / TEXTURESIZE) * MAPSIZE
                let tex = this.roof[texIndex]
                let colStart = getWholeImageDataFromSpriteSheet(tex, texX % TEXTURESIZE, texY % TEXTURESIZE)
                let light = AMBIENTLIGHT;
                this.lights.forEach(lightSource => {
                    light += lightSource.rayTrace(texX / TEXTURETOCUBE, texY / TEXTURETOCUBE)
                })
                if (light < -255) light = -255;
                if (light > 0) light = 0;
                for (let drawX = 0; drawX < FLOOREDLINEWIDTH; drawX++) {
                    for (let drawY = 0; drawY < SIDERES; drawY++) {
                        let dataIndex = (lineX + drawX + (y + drawY) * DRAWWIDTH) * 4
                        for (let i = 0; i < 4; i++) {
                            frameBuffer.data[dataIndex + i] = (i < 3 ? light : 0) + images.imageData.data[colStart + i];
                        }
                    }
                }
            }
        }
        c.putImageData(frameBuffer, 0, 0)
        //Mapeditor

        this.drawLightEditor()
        this.drawMapEditor()
        c.globalAlpha = 0.03;
        rays.forEach(ray => {
            c.drawLine({ from: { x: player.x * EDITORSCALE, y: player.y * EDITORSCALE }, to: { x: ray.x * EDITORSCALE, y: ray.y * EDITORSCALE, color: "black" }, lineWidth: 1 })
        })
        c.globalAlpha = 1;
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
            this.pitch += RENDERSCALE / 4 * deltaTime;
            this.pitch = this.pitch.clamp(-RENDERSCALE * 12, RENDERSCALE * 12)
        }
        if (pressedKeys['ArrowDown']) {
            this.pitch -= RENDERSCALE / 4 * deltaTime;
            this.pitch = this.pitch.clamp(-RENDERSCALE * 12, RENDERSCALE * 12)
        }
        this.draw();
    }
    draw() {
        //c.fillRect(this.x - 2, this.y - 2, 4, 4)
        //c.drawLine({ from: this, to: { x: this.x + this.deltaX * 20, y: this.y + this.deltaY * 20 } })
    }
}

function getRay(from, angle, maxdof = MAXDOF, ignoreTex = false) {
    let horizontalRay = getHorizontalRay(from, angle, maxdof, ignoreTex);
    let verticalRay = getVerticalRay(from, angle, maxdof, ignoreTex);

    horizontalRay.distance = distance(from.x, from.y, horizontalRay.x, horizontalRay.y);
    verticalRay.distance = distance(from.x, from.y, verticalRay.x, verticalRay.y);

    if (verticalRay.distance > horizontalRay.distance) {
        return horizontalRay
    } else {
        return verticalRay
    }
}

function getHorizontalRay(from, angle, maxdof = MAXDOF, ignoreTex = false) {
    let rayX, rayY, rayOffseyX, rayOffseyY, dof = 0, mapX, mapY, mapIndex, maxed;
    let aTan = -1 / Math.tan(angle)
    if (angle > Math.PI) {
        rayY = ~~(from.y / CUBESIZE) * CUBESIZE - 0.0001;
        rayX = (from.y - rayY) * aTan + from.x;
        rayOffseyY = -CUBESIZE;
        rayOffseyX = -rayOffseyY * aTan;
    }
    if (angle < Math.PI) {
        rayY = ~~(from.y / CUBESIZE) * CUBESIZE + CUBESIZE;
        rayX = (from.y - rayY) * aTan + from.x;
        rayOffseyY = CUBESIZE;
        rayOffseyX = -rayOffseyY * aTan;
    }
    if (angle == 0 || angle == Math.PI) {
        rayX = from.x;
        rayY = from.y;
        dof = maxdof;
    }
    while (dof < maxdof && !maxed) {
        mapX = ~~(rayX / CUBESIZE)
        mapY = ~~(rayY / CUBESIZE)
        mapIndex = mapX + mapY * MAPSIZE;
        if (mapIndex >= 0 && mapIndex < MAXMAPINDEX && map.wall[mapIndex] !== 0) {
            maxed = true
        } else {
            rayX += rayOffseyX;
            rayY += rayOffseyY;
            dof++;
        };
    }
    return { x: rayX, y: rayY, side: 0, tex: ignoreTex ? undefined : map.wall[mapIndex] || Object.values(images.textures)[0], dof: dof, maxed: maxed }

}

function getVerticalRay(from, angle, maxdof = MAXDOF, ignoreTex = false) {
    let rayX, rayY, rayOffseyX, rayOffseyY, dof = 0, mapX, mapY, mapIndex, maxed;
    let nTan = -Math.tan(angle)
    if (angle > Math.PI / 2 && angle < Math.PI * 3 / 2) {
        rayX = ~~(from.x / CUBESIZE) * CUBESIZE - 0.0001;
        rayY = (from.x - rayX) * nTan + from.y;
        rayOffseyX = -CUBESIZE;
        rayOffseyY = -rayOffseyX * nTan;
    }
    if (angle < Math.PI / 2 || angle > Math.PI * 3 / 2) {
        rayX = ~~(from.x / CUBESIZE) * CUBESIZE + CUBESIZE;
        rayY = (from.x - rayX) * nTan + from.y;
        rayOffseyX = CUBESIZE;
        rayOffseyY = -rayOffseyX * nTan;
    }
    if (angle == Math.PI / 2 || angle == Math.PI * 3 / 2) {
        rayX = from.x;
        rayY = from.y;
        dof = maxdof;
    }
    while (dof < maxdof && !maxed) {
        mapX = ~~(rayX / CUBESIZE)
        mapY = ~~(rayY / CUBESIZE)
        mapIndex = mapX + mapY * MAPSIZE;
        if (mapIndex >= 0 && mapIndex < MAXMAPINDEX && map.wall[mapIndex] !== 0) {
            maxed = true
        } else {
            rayX += rayOffseyX;
            rayY += rayOffseyY;
            dof++;
        };
    }
    return { x: rayX, y: rayY, side: 1, tex: ignoreTex ? undefined : map.wall[mapIndex] || Object.values(images.textures)[0], dof: dof, maxed: maxed }

}

init();
