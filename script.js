"use strict";

const vs = `#version 300 es
in vec4 a_position;
in vec2 a_texcoord;
in vec3 a_normal;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform mat4 u_textureMatrix;

out vec2 v_texcoord;
out vec3 v_projectedTexcoord;
out vec3 v_normal;
out vec3 v_surfaceToLight;
out vec3 v_surfaceToView;

uniform vec3 u_lightWorldPosition;
uniform vec3 u_viewWorldPosition;

void main() {
  // Multiply the position by the matrix.
  vec4 worldPosition = u_world * a_position;

  gl_Position = u_projection * u_view * worldPosition;

  // Pass the texture coord to the fragment shader.
  v_texcoord = a_texcoord;

  vec4 projectedTexcoord = u_textureMatrix * worldPosition;
  v_projectedTexcoord = projectedTexcoord.xyz / projectedTexcoord.w;

  // orient the normals and pass to the fragment shader
  v_normal = mat3(u_world) * a_normal;
  
  // Compute the vector of the surface to the light
  // and pass it to the fragment shader
  v_surfaceToLight = u_lightWorldPosition - worldPosition.xyz;

  // Compute the vector of the surface to the view/camera
  // and pass it to the fragment shader
  v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
}
`;

const fs = `#version 300 es
precision highp float;

// Passed in from the vertex shader.
in vec2 v_texcoord;
in vec3 v_projectedTexcoord;
in vec3 v_normal;
in vec3 v_surfaceToLight;
in vec3 v_surfaceToView;

uniform vec4 u_colorMult;
uniform sampler2D u_texture;
uniform sampler2D u_projectedTexture;
uniform float u_bias;
uniform vec2 u_shadowMapSize;
uniform float u_shininess;
uniform vec3 u_lightColor;

out vec4 outColor;

float sampleShadowMap(vec2 uv, float compare) {
    float depth = texture(u_projectedTexture, uv).r;
    return step(compare, depth);
}

float sampleShadowMapPCF(vec3 projectedTexcoord, float bias) {
    vec2 texelSize = 1.0 / u_shadowMapSize;
    float result = 0.0;
    for(int x = -1; x <= 1; ++x) {
        for(int y = -1; y <= 1; ++y) {
            vec2 offset = vec2(float(x), float(y)) * texelSize;
            result += sampleShadowMap(projectedTexcoord.xy + offset, projectedTexcoord.z - bias);
        }
    }
    return result / 9.0;
}

void main() {
    vec3 normal = normalize(v_normal);
    vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
    vec3 surfaceToViewDirection = normalize(v_surfaceToView);
    vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

    float light = dot(normal, surfaceToLightDirection);
    float specular = 0.0;
    if (light > 0.0) {
        specular = pow(dot(normal, halfVector), u_shininess);
    }

    float currentDepth = v_projectedTexcoord.z + u_bias;

    bool inRange =
        v_projectedTexcoord.x >= 0.0 &&
        v_projectedTexcoord.x <= 1.0 &&
        v_projectedTexcoord.y >= 0.0 &&
        v_projectedTexcoord.y <= 1.0;

    float shadowLight = inRange ? sampleShadowMapPCF(v_projectedTexcoord, u_bias) : 1.0;

    vec4 texColor = texture(u_texture, v_texcoord) * u_colorMult;
    vec3 ambient = texColor.rgb * 0.1;
    vec3 diffuse = texColor.rgb * light * u_lightColor;
    vec3 specularColor = specular * u_lightColor;

    outColor = vec4(ambient + (diffuse + specularColor) * shadowLight, texColor.a);
}
`;

const colorVS = `#version 300 es
in vec4 a_position;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

void main() {
  // Multiply the position by the matrices.
  gl_Position = u_projection * u_view * u_world * a_position;
}
`;

const colorFS = `#version 300 es
precision highp float;

uniform vec4 u_color;

out vec4 outColor;

void main() {
  outColor = u_color;
}
`;

function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  // setup GLSL programs
  // note: Since we're going to use the same VAO with multiple
  // shader programs we need to make sure all programs use the
  // same attribute locations. There are 2 ways to do that.
  // (1) assign them in GLSL. (2) assign them by calling `gl.bindAttribLocation`
  // before linking. We're using method 2 as it's more. D.R.Y.
  const programOptions = {
    attribLocations: {
      a_position: 0,
      a_normal: 1,
      a_texcoord: 2,
      a_color: 3,
    },
  };
  const textureProgramInfo = twgl.createProgramInfo(
    gl,
    [vs, fs],
    programOptions
  );
  const colorProgramInfo = twgl.createProgramInfo(
    gl,
    [colorVS, colorFS],
    programOptions
  );

  // Tell the twgl to match position with a_position,
  // normal with a_normal etc..
  twgl.setAttributePrefix("a_");

  const sphereBufferInfo = twgl.primitives.createSphereBufferInfo(
    gl,
    1, // radius
    32, // subdivisions around
    24 // subdivisions down
  );
  const sphereVAO = twgl.createVAOFromBufferInfo(
    gl,
    textureProgramInfo,
    sphereBufferInfo
  );
  const planeBufferInfo = twgl.primitives.createPlaneBufferInfo(
    gl,
    20, // width
    20, // height
    1, // subdivisions across
    1 // subdivisions down
  );
  const planeVAO = twgl.createVAOFromBufferInfo(
    gl,
    textureProgramInfo,
    planeBufferInfo
  );
  const cubeBufferInfo = twgl.primitives.createCubeBufferInfo(
    gl,
    2 // size
  );
  const cubeVAO = twgl.createVAOFromBufferInfo(
    gl,
    textureProgramInfo,
    cubeBufferInfo
  );
  const cubeLinesBufferInfo = twgl.createBufferInfoFromArrays(gl, {
    position: [
      -1, -1, -1, 1, -1, -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, 1, 1,
      1, 1, 1,
    ],
    indices: [
      0, 1, 1, 3, 3, 2, 2, 0,

      4, 5, 5, 7, 7, 6, 6, 4,

      0, 4, 1, 5, 3, 7, 2, 6,
    ],
  });
  const cubeLinesVAO = twgl.createVAOFromBufferInfo(
    gl,
    colorProgramInfo,
    cubeLinesBufferInfo
  );

  // make a 8x8 checkerboard texture
  const checkerboardTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, checkerboardTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // mip level
    gl.LUMINANCE, // internal format
    8, // width
    8, // height
    0, // border
    gl.LUMINANCE, // format
    gl.UNSIGNED_BYTE, // type
    new Uint8Array([
      // data
      0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xcc, 0xff, 0xcc, 0xff,
      0xcc, 0xff, 0xcc, 0xff, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc,
      0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xff, 0xcc, 0xff, 0xcc,
      0xff, 0xcc, 0xff, 0xcc, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff,
      0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xcc, 0xff, 0xcc, 0xff,
      0xcc, 0xff, 0xcc, 0xff,
    ])
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  const depthTexture = gl.createTexture();
  const depthTextureSize = 2048;
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(
    gl.TEXTURE_2D, // target
    0, // mip level
    gl.DEPTH_COMPONENT32F, // internal format
    depthTextureSize, // width
    depthTextureSize, // height
    0, // border
    gl.DEPTH_COMPONENT, // format
    gl.FLOAT, // type
    null
  ); // data
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const depthFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER, // target
    gl.DEPTH_ATTACHMENT, // attachment point
    gl.TEXTURE_2D, // texture target
    depthTexture, // texture
    0
  ); // mip level

  function degToRad(d) {
    return (d * Math.PI) / 180;
  }

  const settings = {
    cameraX: 6,
    cameraY: 5,
    posX: 2.5,
    posY: 4.8,
    posZ: 4.3,
    targetX: 2.5,
    targetY: 0,
    targetZ: 3.5,
    projWidth: 1,
    projHeight: 1,
    perspective: true,
    fieldOfView: 120,
    bias: -0.0001, // Adjusted bias for better shadow rendering
    ambientLight: 0.7,
    lightIntensity: 2.5,
  };
  webglLessonsUI.setupUI(document.querySelector("#ui"), settings, [
    {
      type: "slider",
      key: "cameraX",
      min: -10,
      max: 10,
      change: render,
      precision: 2,
      step: 0.001,
    },
    {
      type: "slider",
      key: "cameraY",
      min: 1,
      max: 20,
      change: render,
      precision: 2,
      step: 0.001,
    },
    {
      type: "slider",
      key: "posX",
      min: -10,
      max: 10,
      change: render,
      precision: 2,
      step: 0.001,
    },
    {
      type: "slider",
      key: "posY",
      min: 1,
      max: 20,
      change: render,
      precision: 2,
      step: 0.001,
    },
    {
      type: "slider",
      key: "posZ",
      min: 1,
      max: 20,
      change: render,
      precision: 2,
      step: 0.001,
    },
    {
      type: "slider",
      key: "targetX",
      min: -10,
      max: 10,
      change: render,
      precision: 2,
      step: 0.001,
    },
    {
      type: "slider",
      key: "targetY",
      min: 0,
      max: 20,
      change: render,
      precision: 2,
      step: 0.001,
    },
    {
      type: "slider",
      key: "targetZ",
      min: -10,
      max: 20,
      change: render,
      precision: 2,
      step: 0.001,
    },
    {
      type: "slider",
      key: "projWidth",
      min: 0,
      max: 2,
      change: render,
      precision: 2,
      step: 0.001,
    },
    {
      type: "slider",
      key: "projHeight",
      min: 0,
      max: 2,
      change: render,
      precision: 2,
      step: 0.001,
    },
    { type: "checkbox", key: "perspective", change: render },
    { type: "slider", key: "fieldOfView", min: 1, max: 179, change: render },
    {
      type: "slider",
      key: "bias",
      min: -0.01,
      max: 0.00001,
      change: render,
      precision: 4,
      step: 0.0001,
    },
  ]);

  const fieldOfViewRadians = degToRad(60);

  const sphereUniforms = {
    u_colorMult: [1, 0.5, 0.5, 1], // pink
    u_color: [0, 0, 1, 1],
    u_texture: checkerboardTexture,
    u_world: m4.translation(2, 3, 4),
  };

  const cubeUniforms = {
    u_colorMult: [0.5, 1, 0.5, 1], // lightgreen
    u_color: [0, 0, 1, 1],
    u_texture: checkerboardTexture,
    u_world: m4.translation(3, 1, 0),
  };

  const planeUniforms = {
    u_colorMult: [0.5, 0.5, 1, 1], // lightblue
    u_color: [1, 0, 0, 1],
    u_texture: checkerboardTexture,
    u_world: m4.translation(0, 0, 0),
  };

  function drawScene(
    projectionMatrix,
    cameraMatrix,
    textureMatrix,
    lightWorldMatrix,
    programInfo
  ) {
    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix);

    gl.useProgram(programInfo.program);

    // set uniforms that are the same for both the sphere and plane
    // note: any values with no corresponding uniform in the shader
    // are ignored.
    twgl.setUniforms(programInfo, {
      u_view: viewMatrix,
      u_projection: projectionMatrix,
      u_bias: settings.bias,
      u_textureMatrix: textureMatrix,
      u_projectedTexture: depthTexture,
      u_shadowMapSize: [depthTextureSize, depthTextureSize],
      u_lightWorldPosition: [settings.posX, settings.posY, settings.posZ],
      u_viewWorldPosition: cameraMatrix.slice(12, 15),
      u_lightColor: [1, 1, 1],
      u_shininess: 150,
    });

    // ------ Draw the sphere --------

    // Setup all the needed attributes.
    gl.bindVertexArray(sphereVAO);

    // Set the uniforms unique to the sphere
    twgl.setUniforms(programInfo, sphereUniforms);

    // calls gl.drawArrays or gl.drawElements
    twgl.drawBufferInfo(gl, sphereBufferInfo);

    // ------ Draw the cube --------

    // Setup all the needed attributes.
    gl.bindVertexArray(cubeVAO);

    // Set the uniforms unique to the cube
    twgl.setUniforms(programInfo, cubeUniforms);

    // calls gl.drawArrays or gl.drawElements
    twgl.drawBufferInfo(gl, cubeBufferInfo);

    // ------ Draw the plane --------

    // Setup all the needed attributes.
    gl.bindVertexArray(planeVAO);

    // Set the uniforms unique to the cube
    twgl.setUniforms(programInfo, planeUniforms);

    // calls gl.drawArrays or gl.drawElements
    twgl.drawBufferInfo(gl, planeBufferInfo);
  }

  // Draw the scene.
  function render() {
    twgl.resizeCanvasToDisplaySize(gl.canvas);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // first draw from the POV of the light
    const lightWorldMatrix = m4.lookAt(
      [settings.posX, settings.posY, settings.posZ], // position
      [settings.targetX, settings.targetY, settings.targetZ], // target
      [0, 1, 0] // up
    );
    const lightProjectionMatrix = settings.perspective
      ? m4.perspective(
          degToRad(settings.fieldOfView),
          settings.projWidth / settings.projHeight,
          0.5, // near
          10
        ) // far
      : m4.orthographic(
          -settings.projWidth / 2, // left
          settings.projWidth / 2, // right
          -settings.projHeight / 2, // bottom
          settings.projHeight / 2, // top
          0.5, // near
          10
        ); // far

    // draw to the depth texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.viewport(0, 0, depthTextureSize, depthTextureSize);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawScene(
      lightProjectionMatrix,
      lightWorldMatrix,
      m4.identity(),
      lightWorldMatrix,
      colorProgramInfo
    );

    // now draw scene to the canvas projecting the depth texture into the scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let textureMatrix = m4.identity();
    textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.multiply(textureMatrix, lightProjectionMatrix);
    // use the inverse of this world matrix to make
    // a matrix that will transform other positions
    // to be relative this this world space.
    textureMatrix = m4.multiply(textureMatrix, m4.inverse(lightWorldMatrix));

    // Compute the projection matrix
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = m4.perspective(
      fieldOfViewRadians,
      aspect,
      1,
      2000
    );

    // Compute the camera's matrix using look at.
    const cameraPosition = [settings.cameraX, settings.cameraY, 7];
    const target = [0, 0, 0];
    const up = [0, 1, 0];
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);

    drawScene(
      projectionMatrix,
      cameraMatrix,
      textureMatrix,
      lightWorldMatrix,
      textureProgramInfo
    );

    // ------ Draw the frustum ------
    {
      const viewMatrix = m4.inverse(cameraMatrix);

      gl.useProgram(colorProgramInfo.program);

      // Setup all the needed attributes.
      gl.bindVertexArray(cubeLinesVAO);

      // scale the cube in Z so it's really long
      // to represent the texture is being projected to
      // infinity
      const mat = m4.multiply(
        lightWorldMatrix,
        m4.inverse(lightProjectionMatrix)
      );

      // Set the uniforms we just computed
      twgl.setUniforms(colorProgramInfo, {
        u_color: [1, 1, 1, 1],
        u_view: viewMatrix,
        u_projection: projectionMatrix,
        u_world: mat,
      });

      // calls gl.drawArrays or gl.drawElements
      twgl.drawBufferInfo(gl, cubeLinesBufferInfo, gl.LINES);
    }
  }
  render();
}

main();
