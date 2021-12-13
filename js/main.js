import * as THREE from './libs/three.module.js';
import { GLTFLoader } from './libs/plugins/GLTFLoader.js';
import { TessellateModifier } from './libs/plugins/TessellateModifier.js';
import { MetalShader, WingShader } from './shader.js';
import { Player } from './player.js';

//doms
const container=document.getElementById("container");
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 2000 );
const renderer=new THREE.WebGLRenderer({antialias:true});
let envMap=null;

//objects
let Sculpture=null;
let player=null;

//controls
const clock = new THREE.Clock();
let isMousePressed=false;
const keyStates = {};
const isCaptionShown=[false,false,false,false,false];

//scatter transitions
let baseLevel=0.0, scaleLevel=0.0;
let scatterAnimSecs=0.0, scatterAnimDir = 0;

//for mobile
const hammertime = new Hammer(container);

const isMobile = () => { try { document.createEvent("TouchEvent"); return true; } catch (e) { return false; } };
hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });


function initLight()
{
	let light = new THREE.DirectionalLight( 0xffffff );
	light.intensity=0.5;
	light.position.set( 0.5, 0.5, 1 );
	scene.add( light );

	let pointLight = new THREE.PointLight( 0x888888 );
	pointLight.position.set( 50, 50, 100 );
	scene.add( pointLight );

	let ambientLight = new THREE.AmbientLight( 0x999999 );
	scene.add( ambientLight );
}

function loadEnvMap()
{
	const cubeTextureLoader = new THREE.CubeTextureLoader();
	cubeTextureLoader.setPath( 'assets/skybox/' );

	envMap = cubeTextureLoader.load( [
		"right.jpg", "left.jpg",
		"top.jpg", "bottom.jpg",
		"front.jpg", "back.jpg"
	] );

	scene.background = envMap;
}

function loadObject(callback)
{
	const loader = new GLTFLoader();
	const tessellateModifier = new TessellateModifier( 8, 6 );

	// Load a glTF resource
	loader.load(
		'assets/superhuman.glb',
		function ( gltf ) {
			Sculpture=gltf.scene;
			Sculpture.position.set(0,0,0);
			Sculpture.rotation.y=-Math.PI/2;
			scene.add(Sculpture);
			for(let i=0;i<Sculpture.children.length;i++)
			{
				let child = Sculpture.children[i];
				let material;

				if(i == 2) continue;
				else if(i == 3 || i == 4)
				{
					material = new THREE.ShaderMaterial( {
						uniforms: THREE.UniformsUtils.clone( WingShader.uniforms ),
						vertexShader: WingShader.vertexShader,
						fragmentShader: WingShader.fragmentShader
					} );
				}
				else
				{
					material = new THREE.ShaderMaterial( {
						uniforms: THREE.UniformsUtils.clone( MetalShader.uniforms ),
						vertexShader: MetalShader.vertexShader,
						fragmentShader: MetalShader.fragmentShader
					} );
				}
				material.uniforms['envMap'].value = envMap;
				material.uniforms['fragile'].value = 0.0;

				child.geometry = tessellateModifier.modify( child.geometry );
				initTesselate(child.geometry);

				child.material = material;
			}
		}
	);
}

function addPlane()
{
	const gt = new THREE.TextureLoader().load( "assets/marble.png" );
	const gg = new THREE.PlaneGeometry( 2000, 2000 );
	const gm = new THREE.MeshPhongMaterial( { color: 0xffffff, map: gt,  } );

	const ground = new THREE.Mesh( gg, gm );
	ground.rotation.x = - Math.PI / 2;
	ground.material.map.repeat.set( 256, 256 );
	ground.material.map.wrapS = THREE.MirroredRepeatWrapping;
	ground.material.map.wrapT = THREE.MirroredRepeatWrapping;
	ground.material.map.encoding = THREE.sRGBEncoding;

	scene.add( ground );
}

function initTesselate(geometry)
{

	const numFaces = geometry.attributes.position.count / 3;
	const displacement = new Float32Array( numFaces * 3 * 3 );

	const posArr= geometry.attributes.position.array;

	const subVector=function(a,b){return new THREE.Vector3().subVectors(a,b)};
	const crossVector=function(a,b){return new THREE.Vector3().crossVectors(a,b)};
	for ( let f = 0; f < numFaces; f ++ ) {
		const index = 9 * f;

		let v=[null, null, null];
		for(let i=0;i<3;i++)
		{
			v[i]=new THREE.Vector3().fromArray(posArr, index + 3*i);
		}

		const normal = crossVector(subVector(v[1],v[0]), subVector(v[2],v[0])).normalize();
		const muge = new THREE.Vector3((v[0].x+v[1].x+v[2].x / 3), (v[0].y+v[1].y+v[2].y / 3), (v[0].z+v[1].z+v[2].z / 3));

		const d = 5 * ( 0.5 - Math.random() );

		for ( let i = 0; i < 3; i ++ ) {
			let point = muge.clone().addScaledVector(normal, d);
			let dir=point.clone().sub(v[i]);


			displacement[ index + ( 3 * i ) ] = dir.x;
			displacement[ index + ( 3 * i ) + 1 ] = dir.y;
			displacement[ index + ( 3 * i ) + 2 ] = dir.z;
		}
	}
	geometry.setAttribute( 'displacement', new THREE.BufferAttribute( displacement, 3 ) );
}

function initEventListeners()
{
	// EVENTS
	container.addEventListener( 'mousedown', onMousePressed );
	container.addEventListener( 'mousemove', onMouseMoved , false);
	container.addEventListener('wheel', onMouseScrolled);
	window.addEventListener( 'mouseup', onMouseReleased );
	window.addEventListener( 'resize', onWindowResize );
	document.addEventListener( 'keydown', ( e ) => {
		keyStates[ e.code ] = true;
	} );
	document.addEventListener( 'keyup', ( e ) => {
		keyStates[ e.code ] = false;
	} );

	// mobile events
	if(isMobile())
	{
		hammertime.on('panmove', function(e){
			player.cameraRotate(-e.velocityX/50, 0);
			scatterDelta(e.velocityY / 100);
		});
		initMobileButtons();
	}
}

function initMobileButtons()
{
	if(!isMobile) return;

	const buttonParent=document.getElementById("buttons");
	buttonParent.style.display="flex";

	const frontButton=document.getElementById("front_button");
	const backButton=document.getElementById("back_button");

	frontButton.addEventListener('touchstart', (e)=>{keyStates['FrontTouch'] = true;});
	frontButton.addEventListener('touchend', (e)=>{keyStates['FrontTouch'] = false;});
	backButton.addEventListener('touchstart', (e)=>{keyStates['BackTouch'] = true;});
	backButton.addEventListener('touchend', (e)=>{keyStates['BackTouch'] = false;});
}

function init()
{
	//camera & player settings
	camera.rotation.order = 'YXZ';
	camera.rotation.x=0.26;
	player = new Player(camera);
	player.tp(0, 1, 45);

	initLight();
	loadEnvMap();
	addPlane();
	loadObject();

	//renderer
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	initEventListeners();
	showCaption(1);
}

function animate()
{
	requestAnimationFrame( animate );
	const deltaTime = Math.min( 0.1, clock.getDelta() );
	player.movement(getMoveVector(), deltaTime);
	runScatter(deltaTime);
	showCaptions();
	renderer.render( scene, camera);
}

function getMoveVector()
{
	let res=new THREE.Vector2(0,0);
	if(keyStates['KeyW'] === true || keyStates['ArrowUp'] === true || keyStates['FrontTouch'] === true) res.y++;
	if(keyStates['KeyS'] === true || keyStates['ArrowDown'] === true || keyStates['BackTouch'] === true) res.y--;
	if(keyStates['KeyA'] === true || keyStates['ArrowLeft'] === true) res.x--;
	if(keyStates['KeyD'] === true || keyStates['ArrowRight'] === true) res.x++;
	return res;
}

function onMouseScrolled(e)
{
	scatterDelta(e.deltaY / 5000);
}

function clamp(a, _min, _max)
{
	return a>_min ? (a<_max ? a : _max) : _min;
}

//tesselate sculpture
function scatter(amount=null)
{
	if(typeof amount === "number")
	{
		baseLevel = clamp(amount, 0, 1);
	}

	let level = clamp(baseLevel + scaleLevel * 0.4, 0, 1);

	if(Sculpture == null) return;
	for(let i=0;i<Sculpture.children.length;i++)
	{
		let child = Sculpture.children[i];
		if(i == 2) child.material.emissiveIntensity = 1-level;
		else child.material.uniforms['fragile'].value = level;
	}
}

function scatterDelta(delta)
{
	if(scatterAnimDir != 0) return;
	scaleLevel = clamp(scaleLevel + delta, 0, 1);
	scatter();
}

function runScatter(delta)
{
	let pos=player.position, dir=player.velocity.clone();
	pos.sub(dir);
	pos.y = 0;

	let dist = player.dist;
	let prevDist = pos.length();

	if(dist < 8 && prevDist > 8)
	{
		scatterAnimDir = 1;
		baseLevel = clamp(baseLevel + scaleLevel * 0.4, 0, 1);
		scaleLevel = 0;
	}
	else if(dist > 8 && prevDist < 8)
	{
		scatterAnimDir = -1;
		baseLevel = clamp(baseLevel + scaleLevel * 0.4, 0, 1);
		scaleLevel = 0;
	}
	if(scatterAnimDir != 0)
	{
		scatterAnimSecs += delta * scatterAnimDir * 0.1;
		scatter(baseLevel + scatterAnimSecs * scatterAnimDir);
		if(scatterAnimSecs > 1)
		{
			scatterAnimSecs = 1; scatterAnimDir = 0;
		}
		else if(scatterAnimSecs < 0 || ( scatterAnimDir == -1 && baseLevel < (30 - dist) / 60 ) )
		{
			scatterAnimSecs = 0; scatterAnimDir = 0;
			if(baseLevel < (30 - dist) / 60) scatter((30 - dist) / 60);
		}
	}
	else
	{
		if(dist > 30) scatter(0);
		else if(dist > 8) scatter((30 - dist) / 60);
	}
}

//show captions
function showCaptions()
{
	let dist = player.dist;

	if(isCaptionShown[0] && !isCaptionShown[1] && dist < 40) showCaption(2);
	else if(!isCaptionShown[2] && dist < 30) showCaption(3);
	else if(!isCaptionShown[3] && dist < 20) showCaption(4);
	else if(!isCaptionShown[4] && dist < 10) showCaption(5);
}

function showCaption(n, callback=()=>{})
{
	if(isCaptionShown[n-1]) return;
	const caption = document.getElementById( 'log'+n );
	caption.classList.add('show');
	caption.addEventListener('animationend', function() {
		if (!isCaptionShown[n-1]) {
			isCaptionShown[n-1] = true;
			callback();
		}
	});
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
}

function onMousePressed(e) {
	isMousePressed=true;
}
function onMouseMoved(e)
{
	if(isMousePressed)
	{
		player.cameraRotate(-e.movementX/500, -e.movementY/500);
	}
}
function onMouseReleased(e) {
	isMousePressed=false;
}

init();
animate();