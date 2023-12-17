var map = undefined;
const MAPSIZE = 16;
const CUBESIZE = 20;

var player = undefined;


async function init(){
    await loadData();
    map = new Map(MAPSIZE,CUBESIZE);
    player = new Player(100,100)
    update();
}

function update(){
    requestAnimationFrame(update);

    renderC.clearRect(0, 0, renderCanvas.width, renderCanvas.height)
    c.clearRect(0, 0, canvas.width, canvas.height);

    map.draw();
    player.update();

    c.drawText(fps, 20, 80, 20)

    renderC.drawImage(canvas, 0, 0, renderCanvas.width, renderCanvas.height);
}
class Map{
    constructor(){
        this.map = [];
        this.init()
    }
    init(){
        for(let x = 0; x < MAPSIZE; x++){
            for(let y = 0; y < MAPSIZE; y++){
                this.map.push((x == 0 || y == 0 || x == MAPSIZE-1 || y == MAPSIZE-1) ? 1 : 0)
            }
        }
    }
    draw(){
        this.drawRay();

        /*
        for(let x = 0; x < MAPSIZE; x++){
            for(let y = 0; y < MAPSIZE; y++){
                c.fillStyle = this.map[x*MAPSIZE + y] ? "black" : "white";
                c.fillRect(x*CUBESIZE+1,y*CUBESIZE+1,CUBESIZE-2,CUBESIZE-2)
            }
        }*/
    }
    drawRay(){
        let fov = 30*toRad;
        let amount = 120;
        for(let index = 0; index <= amount; index++){
            let angle = (player.angle-fov/2) + index*fov/amount;
            let newAngle = (angle > Math.PI*2 ? angle - Math.PI*2 : (angle < 0 ? angle + Math.PI*2 : angle))
            let ray = player.getRay(newAngle);
            
            let lineWidth = canvas.width / amount;
            let lineX = index * lineWidth;

            ray.distance *= Math.cos(player.angle-newAngle)
            let lineHeight = Math.floor((canvas.height*64/ray.distance))
            let lineOffset = canvas.height/2 - lineHeight/2
            let texX,texY;
            if(ray.side == 0){
                texX = Math.floor(ray.x)%images.seperate.brick.w;
                if(newAngle > Math.PI) texX = images.seperate.brick.w - texX;
            }else{
                texX = Math.floor(ray.y)%images.seperate.brick.w;
                if(newAngle < Math.PI/2 || newAngle > Math.PI*3/2) texX = images.seperate.brick.w - texX;
            }
            for(let y = 0; y < images.seperate.brick.h; y++){
                c.fillStyle = getImageDataFromSpriteSheet(images.seperate.brick,texX,y)
                c.fillRect(Math.floor(lineX),Math.floor(lineOffset+y*(lineHeight/images.seperate.brick.h)),Math.floor(lineWidth),Math.ceil(lineHeight/images.seperate.brick.h))
            }
            for(let y = Math.floor(lineOffset+lineHeight);y<canvas.height;y++){
                let dy = y-canvas.height/2
                let raFix = Math.cos(fixAngle(player.angle-newAngle));
                texX = Math.abs(Math.floor(player.x +Math.cos(newAngle)*256*64/dy/raFix)%32);
                texY = Math.abs(Math.floor(player.y +Math.sin(newAngle)*256*64/dy/raFix)%32);

                c.fillStyle = getImageDataFromSpriteSheet(images.seperate.brick,texX,texY)
                c.fillRect(Math.floor(lineX),y,Math.floor(lineWidth),1)


                c.fillStyle = getImageDataFromSpriteSheet(images.seperate.brick,texX,texY)
                c.fillRect(Math.floor(lineX),canvas.height-y,Math.floor(lineWidth),1)
            }
            //c.drawLine({from:player,to:{x:ray.x,y:ray.y,color:"black"},lineWidth:2})
        }
    }
}

class Player{
    constructor(x,y){
        this.x = x;
        this.y = y;
        this.angle = 0.001;
        this.deltaX = 0;
        this.deltaY = 0;
    }
    update(){
        if(pressedKeys['KeyA']){
            this.angle-=0.02*deltaTime;
            if(this.angle< 0){this.angle+= 2*Math.PI}
            this.deltaX = Math.cos(this.angle);
            this.deltaY = Math.sin(this.angle);
        }
        if(pressedKeys['KeyD']){
            this.angle+=0.02*deltaTime;
            if(this.angle> 2*Math.PI){this.angle-= 2*Math.PI}
            this.deltaX = Math.cos(this.angle);
            this.deltaY = Math.sin(this.angle);
        }
        if(pressedKeys['KeyW']){
            this.x += this.deltaX*deltaTime;
            this.y += this.deltaY*deltaTime;
        }
        if(pressedKeys['KeyS']){
            this.x -= this.deltaX*deltaTime;
            this.y -= this.deltaY*deltaTime;
        }
        this.draw();
    }
    draw(){
        //c.fillRect(this.x-2,this.y-2,4,4)
        //c.drawLine({from:this,to:{x:this.x+this.deltaX*20,y:this.y+this.deltaY*20}})
    }
    getRay(angle){
        let horizontalRay = this.getHorizontalRay(angle);
        let verticalRay = this.getVerticalRay(angle);

        horizontalRay.distance = distance(this.x,this.y,horizontalRay.x,horizontalRay.y);
        verticalRay.distance = distance(this.x,this.y,verticalRay.x,verticalRay.y);

        if(verticalRay.distance > horizontalRay.distance){
            return horizontalRay
        }else{
            return verticalRay
        }
    }
    getHorizontalRay(angle){
        let aTan, rayX, rayY, rayOffseyX,rayOffseyY,dof = 0,mapX,mapY, mapIndex;
        for(let rayIndex = 0; rayIndex<1; rayIndex++){
            aTan = -1 /Math.tan(angle)
            if(angle>Math.PI){
                rayY = Math.floor(this.y/CUBESIZE)*CUBESIZE - 0.0001;
                rayX = (this.y - rayY) * aTan +this.x;
                rayOffseyY = -CUBESIZE;
                rayOffseyX = -rayOffseyY *aTan;
            }
            if(angle<Math.PI){
                rayY = Math.floor(this.y/CUBESIZE)*CUBESIZE + CUBESIZE;
                rayX = (this.y - rayY) * aTan +this.x;
                rayOffseyY = CUBESIZE;
                rayOffseyX = -rayOffseyY *aTan;
            }
            if(angle == 0 || angle == Math.PI){
                rayX = this.x;
                rayY = this.y;
                dof = 16;
            }
            while(dof<16){
                mapX = Math.floor(rayX/CUBESIZE)
                mapY = Math.floor(rayY/CUBESIZE)
                mapIndex = mapX+mapY*MAPSIZE;
                if(mapIndex >= 0 && mapIndex < Math.pow(MAPSIZE,2) && map.map[mapIndex] > 0){dof = 16}else{
                    rayX+=rayOffseyX;
                    rayY+=rayOffseyY;
                    dof++;
                };
            }
            return {x:rayX,y:rayY,side:0,tex:map.map[mapIndex]}
        }
    }
    getVerticalRay(angle){
        let nTan, rayX, rayY, rayOffseyX,rayOffseyY,dof = 0,mapX,mapY,mapIndex;
        for(let rayIndex = 0; rayIndex<1; rayIndex++){
            nTan = -Math.tan(angle)
            if(angle>Math.PI / 2 && angle<Math.PI*3 / 2){
                rayX = Math.floor(this.x/CUBESIZE)*CUBESIZE - 0.0001;
                rayY = (this.x - rayX) * nTan +this.y;
                rayOffseyX = -CUBESIZE;
                rayOffseyY = -rayOffseyX *nTan;
            }
            if(angle<Math.PI / 2 || angle>Math.PI*3 / 2){
                rayX = Math.floor(this.x/CUBESIZE)*CUBESIZE + CUBESIZE;
                rayY = (this.x - rayX) * nTan +this.y;
                rayOffseyX = CUBESIZE;
                rayOffseyY = -rayOffseyX *nTan;
            }
            if(angle == Math.PI / 2 || angle == Math.PI*3 / 2){
                rayX = this.x;
                rayY = this.y;
                dof = 16;
            }
            while(dof<16){
                mapX = Math.floor(rayX/CUBESIZE)
                mapY = Math.floor(rayY/CUBESIZE)
                mapIndex = mapX+mapY*MAPSIZE;
                if(mapIndex >= 0 && mapIndex < Math.pow(MAPSIZE,2) && map.map[mapIndex] > 0){dof = 16}else{
                    rayX+=rayOffseyX;
                    rayY+=rayOffseyY;
                    dof++;
                };
            }
            return {x:rayX,y:rayY,side:1,tex:map.map[mapIndex]}
        }   
    }
}

init();