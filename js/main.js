import * as THREE from './libs/three.module.js';
import { GLTFLoader } from './libs/plugins/GLTFLoader.js';
import { TessellateModifier } from './libs/plugins/TessellateModifier.js';
import { MetalShader, WingShader } from './shader.js';

const container=document.getElementById("container");
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 2000 );
const renderer=new THREE.WebGLRenderer({antialias:true});
let envMap=null;


const clock = new THREE.Clock();
let isMousePressed=false;
let Sculpture=null;
let level=0.0;

const hammertime = new Hammer(container);

const isMobile = () => { try { document.createEvent("TouchEvent"); return true; } catch (e) { return false; } };
hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });

function initLight()
{
	// LIGHTS
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

let debugObj;
function debugSphere()
{
	let geometry=new THREE.SphereBufferGeometry(4,32,24);
//	let geometry=new THREE.BoxBufferGeometry(8,8,8);
	let material=new THREE.ShaderMaterial( {
		uniforms: THREE.UniformsUtils.clone( WingShader.uniforms ),
		vertexShader: WingShader.vertexShader,
		fragmentShader: WingShader.fragmentShader
	} );
	material.uniforms['envMap'].value = envMap;
	material.uniforms['fragile'].value = 0.0;

	const tessellateModifier = new TessellateModifier( 8, 6 );
	geometry = tessellateModifier.modify( geometry );
	initTesselate(geometry);

	debugObj=new THREE.Mesh(geometry, material);
	debugObj.position.set(0,0,0);
	scene.add(debugObj);
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
//		const d = 5;

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

function init()
{
	camera.position.set( 0, 1, 10 );
	camera.rotation.order = 'YXZ';
	camera.rotation.x=0.56;

	const bgCol = new THREE.Color(0x444444);
	scene.background=bgCol;
	scene.fog = new THREE.Fog(bgCol, 900, 1200);

	initLight();
	loadEnvMap();
//	debugSphere();
	loadObject();

	//renderer
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	// EVENTS
	container.addEventListener( 'mousedown', onMousePressed );
	container.addEventListener( 'mousemove', onMouseMoved , false);
	container.addEventListener('wheel', onMouseScrolled);
	window.addEventListener( 'mouseup', onMouseReleased );
	window.addEventListener( 'resize', onWindowResize );

	if(isMobile())
	{
		hammertime.on('panmove', function(e){
			camera.rotation.y += e.velocityX/50;
			scatter(e.velocityY / 100);
		});
	}
	
}

function animate()
{
	requestAnimationFrame( animate );
	const deltaTime = Math.min( 0.1, clock.getDelta() );
	renderer.render( scene, camera);
}


function onMouseScrolled(e)
{
	scatter(e.deltaY / 5000);
}

function scatter(delta)
{
	//change level
	level += delta;
	if(level <0) level =0;
	else if(level > 1) level = 1;

	for(let i=0;i<Sculpture.children.length;i++)
	{
		let child = Sculpture.children[i];
		if(i == 2) child.material.emissiveIntensity = 1-level;
		else child.material.uniforms['fragile'].value = level;
	}
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
		camera.rotation.x += e.movementY/500;
		camera.rotation.y += e.movementX/500;
	}
}
function onMouseReleased(e) {
	isMousePressed=false;
}

init();
animate();