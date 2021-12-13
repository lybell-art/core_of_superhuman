import {Vector3, Vector2} from './libs/three.module.js';

class Player
{
	constructor(camera)
	{
		this.velocity=new Vector3(0,0,0);
		this.cam=camera;
		this.sfx=null;
	}
	get x()
	{
		return this.cam.position.x;
	}
	get y()
	{
		return this.cam.position.y;
	}
	get z()
	{
		return this.cam.position.z;
	}
	get position()
	{
		return this.cam.position.clone();
	}
	get direction()
	{
		let dir=new Vector3();
		this.cam.getWorldDirection( dir );
		dir.y = 0;
		dir.normalize();
		return dir;
	}
	get direction2D()
	{
		let dir=new Vector2(this.direction.x, this.direction.z);
		return dir;
	}
	get dist()
	{
		let x=this.x, y=this.z;
		return Math.sqrt(x*x+y*y);
	}
	getForwardVector()
	{
		return this.direction;
	}
	getSideVector()
	{
		let sideDir=this.direction.cross(this.cam.up);
		sideDir.y = 0;
		sideDir.normalize();
		return sideDir;
	}
	cameraRotate(x, y)
	{
		this.cam.rotation.x += y; // e.movementY/500
		this.cam.rotation.y += x; //e.movementX/500
	}
	isInsideWall(x, y)
	{
		const radius = 50;
		return x*x + y*y < radius*radius;
	}
	movement(keyVector, deltaTime)
	{
		let speed=0.3, maxSpeed=0.6;
		let progress=false, backward=false;
		const decay= Math.exp( - 5 * deltaTime ) - 1;
		this.velocity.addScaledVector(this.velocity, decay);
		if(keyVector.y == 1){this.velocity.addScaledVector( this.getForwardVector(), speed*deltaTime ); progress=true;}
		if(keyVector.y == -1){this.velocity.addScaledVector( this.getForwardVector(),-speed*deltaTime );}
		if(keyVector.x == -1){this.velocity.addScaledVector( this.getSideVector(),-speed*deltaTime); progress=true;}
		if(keyVector.x == 1){this.velocity.addScaledVector( this.getSideVector(),speed*deltaTime ); progress=true;}
		this.velocity.clampLength(0,maxSpeed);

		backward = ( this.velocity.dot(this.getForwardVector()) ) < 0;

		if(this.isInsideWall(this.x + this.velocity.x, this.z + this.velocity.z))
		{
			if(this.velocity.length() > 0.1) this.playSFX();
			else this.stopSFX();
			this.cam.position.add(this.velocity);
		}
	}
	tp(x,y,z)
	{
		if(x instanceof Vector3) this.cam.position.copy(x);
		else this.cam.position.set(x,y,z);
	}
	playSFX()
	{
		if(this.sfx == null) return false;
		if(!this.sfx.isPlaying) this.sfx.play();
	}
	stopSFX()
	{
		if(this.sfx == null) return false;
		if(this.sfx.isPlaying) this.sfx.stop();
	}
}

export {Player};