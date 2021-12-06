let MetalShader = {
	uniforms:{
		'envMap': { value: null },
		'fragile':{value:0.0}
	},
	vertexShader:`
		attribute vec3 displacement;

		uniform float fragile;

		varying vec3 vNormal;
		varying vec3 vPosition;
		void main()
		{
			vNormal = normal;

//			vec3 newPosition = position + normal * fragile * displacement;
			vec3 newPosition = position + fragile * displacement;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
			vPosition = gl_Position.xyz;
		}
	`,
	fragmentShader:`
		uniform samplerCube evnMap;
		uniform float fragile;

		varying vec3 vPosition;
		varying vec3 vNormal;

		vec3 fresnelSchlick(float cosTheta, vec3 F0)
		{
			return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
		}

		void main()
		{
			vec3 mainColor=mix(vec3(0.87, 0.91, 1.0), vec3(0.51, 0.27, 0.1), fragile);
			float roughness = 0.5;
			float metalness = mix(0.7, 0.3, fragile);
			float r_factor = 5.0 / (1.01 -  roughness);

			//reflection
			vec3 nView = normalize(cameraPosition - vPosition);

			vec3 R = reflect(-nView, vNormal);
			vec3 reflectColor = texture( evnMap, R, 4.0 ).xyz * mainColor;

			//diffuse, specular

			vec3 nLight = normalize( vec3(0.5,0.5,1.0) );
			vec3 nNormal = normalize( vNormal );
			vec3 nRefl = reflect(-nLight, vNormal);
			
			float dotLN = dot(nLight, vNormal);
			
			vec3 diffuse = vec3(1.0,1.0,1.0) * dotLN * (1.0-metalness);
			vec3 specular = pow(max(0.0, dot(nView,nRefl)), r_factor) * vec3(1.0,1.0,1.0);
			float ambient = 0.7;

		

			vec3 fresnel = fresnelSchlick(dot(nView, nNormal), vec3(0.56, 0.57, 0.58)) * 0.1;

			vec3 color = (diffuse + specular + ambient + fresnel);
			vec3 color2 = (color) * mix(mainColor, reflectColor, metalness);

			gl_FragColor = vec4(color2, 1.0);
		}
	`
}

let WingShader = {
	uniforms:{
		'envMap': { value: null },
		'fragile':{value:0.0}
	},
	vertexShader:`
		attribute vec3 displacement;

		uniform float fragile;

		varying vec3 vNormal;
		varying vec3 vPosition;
		void main()
		{
			vNormal = normal;

			vec3 newPosition = position + fragile * displacement;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
			vPosition = gl_Position.xyz;
		}
	`,
	fragmentShader:`
		uniform samplerCube evnMap;
		uniform float fragile;

		varying vec3 vPosition;
		varying vec3 vNormal;

		vec3 fresnelSchlick(float cosTheta, vec3 F0)
		{
			return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
		}

		void main()
		{
			vec3 mainColor=vec3(0.5, 1.0, 0.8);
			float roughness = 0.05;
			float metalness = 0.2;
			float r_factor = 5.0 / (1.01 -  roughness);

			//reflection
			vec3 nView = normalize(cameraPosition - vPosition);

			vec3 R = reflect(-nView, vNormal);
			vec3 reflectColor = texture( evnMap, R, 4.0 ).xyz * mainColor;

			//refraction
			float ratio = 1.00 / 1.52;
			vec3 R2 = refract(-nView, vNormal, ratio);
			vec3 refractColor = texture(evnMap, R2, 1.0).rgb;

			//diffuse, specular

			vec3 nLight = normalize( vec3(0.5,0.5,1.0) );
			vec3 nRefl = reflect(-nLight, vNormal);
			
			float dotLN = dot(nLight, vNormal);
			
			vec3 diffuse = vec3(1.0,1.0,1.0) * dotLN * (1.0-metalness);
			vec3 specular = pow(max(0.0, dot(nView,nRefl)), r_factor) * vec3(1.0,1.0,1.0);
			float ambient = 0.7;


			vec3 fresnel = fresnelSchlick(dot(nView, vNormal), vec3(0.56, 0.57, 0.58)) * 0.1;

			vec3 color = (diffuse + specular + ambient + fresnel);
			vec3 color2 = (color) * mix(mainColor, reflectColor, metalness);
			vec3 color3 = mix(color2, refractColor, 0.7);

			gl_FragColor = vec4(color3, 1.0);
		}
	`
}

export {MetalShader, WingShader};