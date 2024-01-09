var map = undefined;

//MAP
const MAPSIZE = 256;
const CUBESIZE = 32;
const LIGHTFREQUENCY = 3
const LIGHTPROBABILITY = 0.7;
const LIGHTSTRENGTH = 4;

//VISUAL
const AMBIENTLIGHT = {
    r: -130,
    g: -130,
    b: -130
};
const HEIGHTTOWIDTH = 44;
const FOV = 70 * TORAD;
const TEXTURESIZE = 128;
const FLASHLIGHTSTRENGTH = 3;

// Processing intensive
const SPRITERENDERDISTANCE = 10;
const LIGHTRENDERDISTANCE = 4;
const MAXDOF = 50;
const RAYAMOUNT = canvas.width;
const SIDERES = 1;
const LIGHTRES = 2;

// Constants of constants
const MAXDIST = MAXDOF * CUBESIZE;
const TEXTURETOCUBE = TEXTURESIZE / CUBESIZE;
const MAXMAPINDEX = Math.pow(MAPSIZE, 2);

const EDITORSCALE = 0.1;

var player = undefined;


async function init() {
    await loadData();
    map = new Map(MAPSIZE, CUBESIZE);
    player = new Player(100, 110, FLASHLIGHTSTRENGTH)
    map.lights.push(player.flashLight);
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
class Wall {
    constructor(img, thickness = CUBESIZE, dir = 1) {
        this.img = img;
        this.thickness = thickness;
        this.dir = dir;
    }
}
class Sprite {
    constructor(x, y, z, width, height, img) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.width = width;
        this.height = height;
        this.img = img;
    }
    draw() {

        let planeX = Math.cos(player.angle + Math.PI / 2) * Math.sin(FOV / 2);
        let planeY = Math.sin(player.angle + Math.PI / 2) * Math.sin(FOV / 2);

        let spriteX = this.x - player.x;
        let spriteY = this.y - player.y;

        let invDet = 1.0 / (planeX * player.deltaY - player.deltaX * planeY);

        let transformX = invDet * (player.deltaY * spriteX - player.deltaX * spriteY);
        let transformY = invDet * (-planeY * spriteX + planeX * spriteY);

        if (transformY < 0) return;

        let spriteScreenX = ((canvas.width / 2) * (1 + transformX / transformY));

        let vMove = (this.z * 10) / transformY;
        let spriteHeight = Math.abs((canvas.height / (transformY)));
        let drawStartY = -spriteHeight / 2 + canvas.height / 2 + player.pitch + vMove + (player.z + Math.cos(player.moveAnim) * player.walkingbob) / distance(this.x, this.y, player.x, player.y);

        let spriteWidth = (canvas.height / (transformY));
        let drawStartX = -spriteWidth / 2 + spriteScreenX;
        let drawEndX = drawStartX - spriteWidth * this.width / 2 + spriteWidth * this.width;
        for (let x = ~~(drawStartX - spriteWidth * this.width / 2); x < drawEndX; x++) {
            if (transformY > map.rayZBuffer[x]) continue;
            let tmpX = (x - ~~(drawStartX - spriteWidth * this.width / 2)) / (~~drawEndX - ~~(drawStartX - spriteWidth * this.width / 2));

            c.drawImageFromSpriteSheet(this.img, { x: x, y: ~~(drawStartY - spriteHeight * this.height / 2), w: 1, h: ~~(spriteHeight * this.height), cropX: ~~(tmpX * this.img.w), cropW: 1 })
        }
    }
}
class Light {
    constructor(x, y, strength, r = 255, g = 255, b = 255) {
        this.x = x;
        this.y = y;
        this.strength = strength;
        this.r = r;
        this.g = g;
        this.b = b;
    }

    rayTrace(x, y, offset) {
        let specialCase = 1;
        if (this.x % 1 != 0 && this.y % 1 != 0) {
            specialCase = 0;
        }
        let minDist = distance(x, y, this.x * CUBESIZE + CUBESIZE / 2 * specialCase, this.y * CUBESIZE + CUBESIZE / 2 * specialCase);

        if (minDist > this.strength * CUBESIZE) {
            return {
                r: 0,
                g: 0,
                b: 0
            }
        }

        let degree = fixAngle(angleFromPoints(x, y, this.x * CUBESIZE + CUBESIZE / 2 * specialCase, this.y * CUBESIZE + CUBESIZE / 2 * specialCase) + 0.0001);
        let ray = getRay({ x: x - Math.cos(degree) * offset, y: y - Math.sin(degree) * offset }, degree, this.strength, true)

        let multiplier = ray.distance < minDist ? 0 : Math.max(0, this.strength * CUBESIZE - Math.min(ray.distance, minDist))

        let r = multiplier / 255 * this.r
        let g = multiplier / 255 * this.g
        let b = multiplier / 255 * this.b

        return {
            r: r,
            g: g,
            b: b
        }
    }
}
class Map {
    constructor() {
        this.roof = [];
        this.wall = [];
        this.floor = [];
        this.lights = [];
        this.sprites = [];
        this.rayZBuffer = [];
        this.init()
    }
    init() {
        let tmpMap = new MazeBuilder((MAPSIZE - 1) / 2, (MAPSIZE - 1) / 2).getMaze();
        for (let x = 0; x < MAPSIZE; x++) {
            for (let y = 0; y < MAPSIZE; y++) {
                this.roof.push(Object.values(images.textures)[1])
                this.wall.push(tmpMap[x][y] ? new Wall(images.textures.brick) : 0)
                this.floor.push(Object.values(images.textures)[1])
                if (tmpMap[x][y] == 0 && Math.random() > LIGHTPROBABILITY) {
                    let tmp = false;
                    this.lights.forEach(light => {
                        if (distance(light.x, light.y, x, y) < LIGHTFREQUENCY) {
                            tmp = true;
                        }
                    })
                    if (tmp) {
                        continue;
                    }
                    this.lights.push(new Light(x, y, LIGHTSTRENGTH, 200, 200, 175))

                    this.sprites.push(new Sprite(x * CUBESIZE + CUBESIZE / 2, y * CUBESIZE + CUBESIZE / 2, -300, 20, 20, images.textures.chandelier))

                }
            }
        }

    }
    draw() {
        this.drawRay();
        this.drawSprites();
    }
    drawSprites() {
        const FILTEREDSPRITES = this.sprites.filter(e => distance(player.x, player.y, e.x, e.y) < SPRITERENDERDISTANCE * CUBESIZE);

        const SORTEDSPRITES = FILTEREDSPRITES.sort((a, b) => distance(a.x, a.y, player.x, player.y) - distance(b.y, b.y, player.x, player.y))

        SORTEDSPRITES.forEach(sprite => {
            sprite.draw();
        })
    }
    drawMapEditor() {
        c.fillStyle = "red"
        c.fillRect(0, 0, MAPSIZE * CUBESIZE * EDITORSCALE, MAPSIZE * CUBESIZE * EDITORSCALE)
        for (let x = 0; x < MAPSIZE; x++) {
            for (let y = 0; y < MAPSIZE; y++) {
                c.fillStyle = this.wall[x + y * MAPSIZE] instanceof Wall ? "black" : "white";
                if (detectCollision(x * CUBESIZE * EDITORSCALE + 1, y * CUBESIZE * EDITORSCALE + 1, CUBESIZE * EDITORSCALE - 2, CUBESIZE * EDITORSCALE - 2, mouse.x, mouse.y, 1, 1)) {
                    c.fillStyle = "gray"
                    if (mouse.down) {
                        mouse.down = false;
                        this.wall[x + y * MAPSIZE] = this.wall[x + y * MAPSIZE] instanceof Wall ? 0 : new Wall(images.textures.brick, 16, 1);
                    }
                }
                c.fillRect(x * CUBESIZE * EDITORSCALE + 1, y * CUBESIZE * EDITORSCALE + 1, CUBESIZE * EDITORSCALE - 2, CUBESIZE * EDITORSCALE - 2)
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
        this.rayZBuffer = [];

        const DRAWHEIGHT = canvas.height;
        const DRAWWIDTH = canvas.width;
        const PITCH = ~~(player.pitch);
        const POSZ = ~~(player.z + Math.cos(player.moveAnim) * player.walkingbob);

        const FILTEREDLIGHTS = this.lights.filter(e => distance(player.x, player.y, e.x * CUBESIZE, e.y * CUBESIZE) < e.strength * CUBESIZE * LIGHTRENDERDISTANCE);
        let floorLight = {
            r: AMBIENTLIGHT.r,
            g: AMBIENTLIGHT.g,
            b: AMBIENTLIGHT.b,
            first: true
        };

        let roofLight = {
            r: AMBIENTLIGHT.r,
            g: AMBIENTLIGHT.g,
            b: AMBIENTLIGHT.b,
            first: true
        };
        let floorLightList = [];
        let roofLightList = [];

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

            this.rayZBuffer.push(ray.distance);

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

            let wallLight = {
                r: AMBIENTLIGHT.r,
                g: AMBIENTLIGHT.g,
                b: AMBIENTLIGHT.b
            };


            FILTEREDLIGHTS.forEach(lightSource => {
                let lighting = lightSource.rayTrace(ray.x, ray.y, 1);
                wallLight.r += lighting.r;
                wallLight.g += lighting.g;
                wallLight.b += lighting.b;
            })

            if (wallLight.r < -255) wallLight.r = -255;
            if (wallLight.r > 0) wallLight.r = 0;
            if (wallLight.g < -255) wallLight.g = -255;
            if (wallLight.g > 0) wallLight.g = 0;
            if (wallLight.b < -255) wallLight.b = -255;
            if (wallLight.b > 0) wallLight.b = 0;

            for (let y = 0; y < TEXTURESIZE; y++) {
                let colStart = getWholeImageDataFromSpriteSheet(ray.tex, texX, y);
                for (let drawX = 0; drawX < lineWidth; drawX++) {
                    for (let drawY = 0; drawY < CEILEDWALLPIXELHEIGHT; drawY++) {
                        let dataIndex = (lineX + drawX + (FLOOREDLINEOFFSET + ~~(WALLPIXELHEIGHT * y) + PITCH + drawY + ~~(POSZ / ray.distance)) * DRAWWIDTH) * 4
                        for (let i = 0; i < 4; i++) {
                            frameBuffer.data[dataIndex + i] = (i == 0 ? wallLight.r : i == 1 ? wallLight.g : i == 2 ? wallLight.b : 0) + images.imageData.data[colStart + i];
                        }
                    }
                }
            }
            const FLOORROOFMULTIPLIER = (256 / 58 * RENDERSCALE) * HEIGHTTOWIDTH * TEXTURETOCUBE / raFix;
            let upper = ~~(lineOffset + lineHeight + PITCH) + ~~(POSZ / ray.distance)
            for (let y = upper; y < DRAWHEIGHT; y += SIDERES) {
                let dy = y - DRAWHEIGHT / 2 - PITCH
                let multiplier = (FLOORROOFMULTIPLIER + (POSZ / raFix * 4)) / dy;
                let tmpX = Math.cos(newAngle) * multiplier;
                let tmpY = Math.sin(newAngle) * multiplier;
                let texX = Math.abs(~~(player.x * (TEXTURETOCUBE) + tmpX));
                let texY = Math.abs(~~(player.y * (TEXTURETOCUBE) + tmpY));

                let texIndex = Math.min(~~(texX / TEXTURESIZE) + ~~(texY / TEXTURESIZE) * MAPSIZE, MAXMAPINDEX - 1);
                let tex = this.floor[texIndex]
                let colStart = getWholeImageDataFromSpriteSheet(tex, texX % TEXTURESIZE, texY % TEXTURESIZE)

                let texXToTexToCube = texX / TEXTURETOCUBE;
                let texYToTexToCube = texY / TEXTURETOCUBE;

                let lightX = ~~(texX / LIGHTRES)
                let lightY = ~~(texY / LIGHTRES)
                if (!floorLightList[lightX]) floorLightList[lightX] = [];

                if (!floorLightList[lightX][lightY]) {
                    floorLight = {
                        r: AMBIENTLIGHT.r,
                        g: AMBIENTLIGHT.g,
                        b: AMBIENTLIGHT.b
                    };

                    FILTEREDLIGHTS.forEach(lightSource => {
                        let minDist = distance(texXToTexToCube, texYToTexToCube, lightSource.x * CUBESIZE + CUBESIZE / 2, lightSource.y * CUBESIZE + CUBESIZE / 2);
                        if (minDist > lightSource.strength * CUBESIZE) {
                            return;
                        }
                        let lighting = lightSource.rayTrace(texXToTexToCube, texYToTexToCube, 1);
                        if (!lighting) return;
                        floorLight.r += lighting.r;
                        floorLight.g += lighting.g;
                        floorLight.b += lighting.b;
                    })
                    if (floorLight.r < -255) floorLight.r = -255;
                    if (floorLight.r > 0) floorLight.r = 0;
                    if (floorLight.g < -255) floorLight.g = -255;
                    if (floorLight.g > 0) floorLight.g = 0;
                    if (floorLight.b < -255) floorLight.b = -255;
                    if (floorLight.b > 0) floorLight.b = 0;
                    floorLightList[lightX][lightY] = floorLight;
                } else {
                    floorLight = floorLightList[lightX][lightY];
                }


                for (let drawX = 0; drawX < FLOOREDLINEWIDTH; drawX++) {
                    for (let drawY = 0; drawY < SIDERES; drawY++) {
                        let dataIndex = (lineX + drawX + (y + drawY) * DRAWWIDTH) * 4
                        for (let i = 0; i < 4; i++) {
                            frameBuffer.data[dataIndex + i] = (i == 0 ? floorLight.r : i == 1 ? floorLight.g : i == 2 ? floorLight.b : 0) + images.imageData.data[colStart + i];
                        }
                    }
                }
            }
            upper = lineOffset + PITCH + (POSZ / ray.distance);
            for (let y = 0; y < upper; y += SIDERES) {

                let dy = y - DRAWHEIGHT / 2 - PITCH
                let multiplier = (FLOORROOFMULTIPLIER - (POSZ / raFix * 4)) / dy;
                let tmpX = Math.cos(newAngle) * multiplier;
                let tmpY = Math.sin(newAngle) * multiplier;
                let texX = Math.abs(~~(-player.x * (TEXTURETOCUBE) + tmpX));
                let texY = Math.abs(~~(-player.y * (TEXTURETOCUBE) + tmpY));

                let texIndex = ~~(texX / TEXTURESIZE) + ~~(texY / TEXTURESIZE) * MAPSIZE
                let tex = this.roof[texIndex]
                let colStart = getWholeImageDataFromSpriteSheet(tex, texX % TEXTURESIZE, texY % TEXTURESIZE)

                let texXToTexToCube = texX / TEXTURETOCUBE;
                let texYToTexToCube = texY / TEXTURETOCUBE;

                let lightX = ~~(texX / LIGHTRES)
                let lightY = ~~(texY / LIGHTRES)
                if (!roofLightList[lightX]) roofLightList[lightX] = [];

                if (!roofLightList[lightX][lightY]) {
                    roofLight = {
                        r: AMBIENTLIGHT.r,
                        g: AMBIENTLIGHT.g,
                        b: AMBIENTLIGHT.b
                    };

                    FILTEREDLIGHTS.forEach(lightSource => {
                        let minDist = distance(texXToTexToCube, texYToTexToCube, lightSource.x * CUBESIZE + CUBESIZE / 2, lightSource.y * CUBESIZE + CUBESIZE / 2);
                        if (minDist > lightSource.strength * CUBESIZE) {
                            return;
                        }
                        let lighting = lightSource.rayTrace(texXToTexToCube, texYToTexToCube, 1);
                        if (!lighting) return;
                        roofLight.r += lighting.r;
                        roofLight.g += lighting.g;
                        roofLight.b += lighting.b;
                    })
                    if (roofLight.r < -255) roofLight.r = -255;
                    if (roofLight.r > 0) roofLight.r = 0;
                    if (roofLight.g < -255) roofLight.g = -255;
                    if (roofLight.g > 0) roofLight.g = 0;
                    if (roofLight.b < -255) roofLight.b = -255;
                    if (roofLight.b > 0) roofLight.b = 0;
                    roofLightList[lightX][lightY] = roofLight;
                } else {
                    roofLight = roofLightList[lightX][lightY];
                }
                for (let drawX = 0; drawX < FLOOREDLINEWIDTH; drawX++) {
                    for (let drawY = 0; drawY < SIDERES; drawY++) {
                        let dataIndex = (lineX + drawX + (y + drawY) * DRAWWIDTH) * 4
                        for (let i = 0; i < 4; i++) {
                            frameBuffer.data[dataIndex + i] = (i == 0 ? roofLight.r : i == 1 ? roofLight.g : i == 2 ? roofLight.b : 0) + images.imageData.data[colStart + i];
                        }
                    }
                }
            }
        }
        c.putImageData(frameBuffer, 0, 0)
        //Mapeditor

        //this.drawLightEditor()
        //this.drawMapEditor()

        /*c.globalAlpha = 0.03;
        rays.forEach(ray => {
            c.drawLine({ from: { x: player.x * EDITORSCALE * 8, y: player.y * EDITORSCALE * 8 }, to: { x: ray.x * EDITORSCALE * 8, y: ray.y * EDITORSCALE * 8, color: "black" }, lineWidth: 1 })
        })
         c.globalAlpha = 1;*/
    }
}

class Player {
    constructor(x, y, lightStrength) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.angle = 0.001;
        this.deltaX = 1;
        this.deltaY = 0;
        this.deltaA = 0;
        this.deltaB = -1;
        this.pitch = 0;
        this.flashLight = new Light(this.x, this.y, lightStrength, 100, 100, 85);

        this.moveAnim = 0;
        this.moveFrequency = 0.2;
        this.walkingbob = 300;

        this.jumpPower = 0;
        this.standardJumpPower = 500;
        this.jumpLooseAmount = 30;
        this.jumping = false;
    }
    update() {

        if (pressedKeys['KeyW']) {
            if (!map.wall[~~((this.x + this.deltaX * deltaTime * 10) / CUBESIZE) + ~~((this.y + this.deltaY * deltaTime * 10) / CUBESIZE) * MAPSIZE]) {
                this.x += this.deltaX * deltaTime * (pressedKeys['ShiftLeft'] ? 1.5 : 1);
                this.y += this.deltaY * deltaTime * (pressedKeys['ShiftLeft'] ? 1.5 : 1);
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
        if (pressedKeys['Space'] && !this.jumping) {
            this.jumping = true;
            this.jumpPower = this.standardJumpPower;
            this.moveAnim = 0;
        }

        if (!this.jumping && (pressedKeys['KeyW'] || pressedKeys['KeyS'] || pressedKeys['KeyA'] || pressedKeys['KeyD'])) {
            this.moveAnim += deltaTime * this.moveFrequency * (pressedKeys['ShiftLeft'] ? 1.5 : 1);
        }
        /*if (pressedKeys['ArrowRight']) {
            this.cameraMove(deltaTime, 0)
        }
        if (pressedKeys['ArrowLeft']) {
            this.cameraMove(-deltaTime, 0)
        }
        if (pressedKeys['ArrowUp']) {
            this.cameraMove(0, -deltaTime)
        }
        if (pressedKeys['ArrowDown']) {
            this.cameraMove(0, deltaTime)
        }*/
        if (this.jumping) {
            this.animateJump();
        }
        this.draw();
        this.flashLight.x = this.x / CUBESIZE;
        this.flashLight.y = this.y / CUBESIZE;
    }
    animateJump() {
        this.z += this.jumpPower * deltaTime;
        this.jumpPower -= this.jumpLooseAmount * deltaTime;

        if (this.z < 0) {
            this.z = 0;
            this.jumping = false;
        }
    }
    cameraMove(x, y) {
        this.angle += 0.02 * x;
        this.angle = fixAngle(this.angle)
        this.deltaX = Math.cos(this.angle);
        this.deltaY = Math.sin(this.angle);
        this.deltaA = Math.cos(fixAngle(this.angle - Math.PI / 2));
        this.deltaB = Math.sin(fixAngle(this.angle - Math.PI / 2));
        this.pitch -= RENDERSCALE / 4 * y;
        this.pitch = this.pitch.clamp(-RENDERSCALE * 12, RENDERSCALE * 12)
    }
    draw() {
        //c.fillStyle = "yellow"
        //c.fillRect((this.x - 2) * EDITORSCALE, (this.y - 2) * EDITORSCALE, 1, 1)
        //c.drawLine({ from: { x: canvas.width / 2, y: canvas.height / 2 }, to: { x: (canvas.width / 2 + this.deltaX * 20), y: (canvas.height / 2 + this.deltaY * 20) }, color: "yellow" })
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
    let sign = angle < Math.PI ? 1 : -1
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
            if (map.wall[mapIndex].thickness === CUBESIZE) {
                maxed = true
            } else if (~~((rayX + sign * (CUBESIZE / 2 - (map.wall[mapIndex].dir == 1 ? map.wall[mapIndex].thickness : CUBESIZE) / 2)) / CUBESIZE) == mapX &&
                ~~((rayY + sign * (CUBESIZE / 2 - (map.wall[mapIndex].dir == -1 ? map.wall[mapIndex].thickness : CUBESIZE) / 2)) / CUBESIZE) == mapY) {
                maxed = true
                rayX += rayOffseyX / (CUBESIZE / (CUBESIZE / 2 - map.wall[mapIndex].thickness / 2))
                rayY += rayOffseyY / (CUBESIZE / (CUBESIZE / 2 - map.wall[mapIndex].thickness / 2))
            } else {
                rayX += rayOffseyX;
                rayY += rayOffseyY;
                dof++;
            }
        } else {
            rayX += rayOffseyX;
            rayY += rayOffseyY;
            dof++;
        };
    }
    return { x: rayX, y: rayY, side: 0, tex: ignoreTex ? undefined : map.wall[mapIndex]?.img || Object.values(images.textures)[1], dof: dof, maxed: maxed }

}

function getVerticalRay(from, angle, maxdof = MAXDOF, ignoreTex = false) {
    let rayX, rayY, rayOffseyX, rayOffseyY, dof = 0, mapX, mapY, mapIndex, maxed;
    let sign = (angle < Math.PI / 2 || angle > Math.PI * 3 / 2) ? 1 : -1
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
            if (map.wall[mapIndex].thickness === CUBESIZE) {
                maxed = true
            } else if (~~((rayX + sign * (CUBESIZE / 2 - (map.wall[mapIndex].dir == 1 ? map.wall[mapIndex].thickness : CUBESIZE) / 2)) / CUBESIZE) == mapX &&
                ~~((rayY + sign * (CUBESIZE / 2 - (map.wall[mapIndex].dir == -1 ? map.wall[mapIndex].thickness : CUBESIZE) / 2)) / CUBESIZE) == mapY) {
                maxed = true
                rayX += rayOffseyX / (CUBESIZE / (CUBESIZE / 2 - map.wall[mapIndex].thickness / 2))
                rayY += rayOffseyY / (CUBESIZE / (CUBESIZE / 2 - map.wall[mapIndex].thickness / 2))
            } else {
                rayX += rayOffseyX;
                rayY += rayOffseyY;
                dof++;
            }
        } else {
            rayX += rayOffseyX;
            rayY += rayOffseyY;
            dof++;
        };
    }
    return { x: rayX, y: rayY, side: 1, tex: ignoreTex ? undefined : map.wall[mapIndex]?.img || Object.values(images.textures)[1], dof: dof, maxed: maxed }

}

init();
