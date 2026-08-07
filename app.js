let scene, camera, renderer, keyMesh;
let pixelsPerMm = 3.78; 
let appVersionCounter = 100; // Starting version baseline

const keyProfiles = {
    schlage: { name: "Schlage SC1", pins: 5, length: 52.0, height: 8.5, bowLength: 22.0, spacings: [5.56, 9.14, 12.72, 16.30, 19.88], depthStep: 0.38 },
    kwikset: { name: "Kwikset KW1", pins: 5, length: 53.0, height: 8.2, bowLength: 23.0, spacings: [5.84, 10.36, 14.88, 19.40, 23.92], depthStep: 0.45 },
    yale:    { name: "Yale Y1", pins: 5, length: 50.0, height: 8.0, bowLength: 22.0, spacings: [5.00, 9.00, 13.00, 17.00, 21.00], depthStep: 0.35 },
    master:  { name: "Master Lock M1", pins: 4, length: 42.0, height: 7.5, bowLength: 18.0, spacings: [6.00, 10.50, 15.00, 19.50], depthStep: 0.40 },
    corbin:  { name: "Corbin 60", pins: 5, length: 51.0, height: 8.6, bowLength: 21.0, spacings: [5.30, 9.50, 13.70, 17.90, 22.10], depthStep: 0.38 },
    weiser:  { name: "Weiser WR5", pins: 5, length: 52.0, height: 8.2, bowLength: 22.0, spacings: [5.80, 10.30, 14.80, 19.30, 23.80], depthStep: 0.42 }
};

init3D();
setupEvents();
setupDraggableOverlay();
generateKey();

function bumpVersion() {
    appVersionCounter++;
    const major = Math.floor(appVersionCounter / 100);
    const minor = Math.floor((appVersionCounter % 100) / 10);
    const patch = appVersionCounter % 10;
    document.getElementById('version-text').innerText = `App Build Version: ${major}.${minor}.${patch}`;
}

function init3D() {
    const container = document.getElementById('canvas-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, -60, 80);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, -40, 50);
    scene.add(dirLight);

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function setupEvents() {
    const slider = document.getElementById('scale-slider');
    const calBox = document.getElementById('calibration-box');
    const overlayToggle = document.getElementById('overlay-toggle');
    const overlayElement = document.getElementById('draggable-overlay');
    const closeOverlayBtn = document.getElementById('close-overlay');
    const keyTypeSelect = document.getElementById('key-type');

    slider.addEventListener('input', (e) => {
        const val = e.target.value;
        const targetWidthMm = 85.6; 
        const basePixels = targetWidthMm * 3.78; 
        calBox.style.width = `${basePixels * (val / 100)}px`;
        pixelsPerMm = 3.78 * (val / 100);
        draw2DOverlay();
        bumpVersion();
    });

    overlayToggle.addEventListener('change', (e) => {
        if(e.target.checked) {
            overlayElement.classList.remove('hidden');
            draw2DOverlay();
        } else {
            overlayElement.classList.add('hidden');
        }
        bumpVersion();
    });

    closeOverlayBtn.addEventListener('click', () => {
        overlayElement.classList.add('hidden');
        overlayToggle.checked = false;
        bumpVersion();
    });

    keyTypeSelect.addEventListener('change', (e) => {
        const profile = keyProfiles[e.target.value];
        document.getElementById('bitting-input').maxLength = profile.pins;
        document.getElementById('bitting-input').value = "3".repeat(profile.pins);
        document.getElementById('bitting-hint').innerText = `Enter ${profile.pins} digits for ${profile.name}`;
        generateKey();
    });

    document.getElementById('generate-btn').addEventListener('click', () => {
        generateKey();
        bumpVersion();
    });

    document.getElementById('bitting-input').addEventListener('input', () => {
        generateKey();
        bumpVersion();
    });
}

function createKeyShape(profile, cuts) {
    const keyShape = new THREE.Shape();
    const shoulderX = 0.0;
    const bladeHeight = profile.height;
    const bowLen = profile.bowLength;

    keyShape.moveTo(-bowLen, -12.0);
    keyShape.lineTo(shoulderX, -12.0);
    keyShape.lineTo(shoulderX, 0.0);
    keyShape.lineTo(shoulderX, bladeHeight);

    let currentX = shoulderX + 3.0;
    cuts.forEach((cutValue, index) => {
        if(isNaN(cutValue)) cutValue = 3;
        const spacingX = shoulderX + (profile.spacings[index] || currentX);
        const cutDepthY = bladeHeight - (cutValue * profile.depthStep + 1.2);

        keyShape.lineTo(spacingX - 1.0, bladeHeight);
        keyShape.lineTo(spacingX, cutDepthY);
        keyShape.lineTo(spacingX + 1.0, bladeHeight);
    });

    keyShape.lineTo(shoulderX + profile.length, bladeHeight);
    keyShape.lineTo(shoulderX + profile.length, 0.0);
    keyShape.lineTo(shoulderX + profile.length, -5.0);
    keyShape.lineTo(-bowLen, -15.0);
    keyShape.closePath();

    return keyShape;
}

function generateKey() {
    if (keyMesh) scene.remove(keyMesh);

    const profileKey = document.getElementById('key-type').value;
    const profile = keyProfiles[profileKey];
    const bittingStr = document.getElementById('bitting-input').value;
    const cuts = bittingStr.split('').map(Number);

    const keyShape = createKeyShape(profile, cuts);
    const thickness = 2.2;

    const extrudeSettings = {
        steps: 1,
        depth: thickness,
        bevelEnabled: true,
        bevelThickness: 0.2,
        bevelSize: 0.2,
        bevelSegments: 2
    };

    const geometry = new THREE.ExtrudeGeometry(keyShape, extrudeSettings);
    geometry.center();

    const material = new THREE.MeshStandardMaterial({ 
        color: 0x94a3b8, 
        metalness: 0.8, 
        roughness: 0.3 
    });

    keyMesh = new THREE.Mesh(geometry, material);
    keyMesh.rotation.x = Math.PI / 2;
    scene.add(keyMesh);

    document.getElementById('download-btn').removeAttribute('disabled');
    draw2DOverlay();
    bumpVersion();
}

function draw2DOverlay() {
    const canvas = document.getElementById('overlay-canvas');
    const ctx = canvas.getContext('2d');
    const profileKey = document.getElementById('key-type').value;
    const profile = keyProfiles[profileKey];
    const bittingStr = document.getElementById('bitting-input').value;
    const cuts = bittingStr.split('').map(Number);

    const totalLenMm = profile.length + profile.bowLength;
    const totalHeightMm = profile.height + 15; 

    canvas.width = totalLenMm * pixelsPerMm;
    canvas.height = totalHeightMm * pixelsPerMm;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.scale(pixelsPerMm, pixelsPerMm);
    ctx.translate(profile.bowLength, profile.height + 5);

    ctx.beginPath();
    ctx.moveTo(-profile.bowLength, -12.0);
    ctx.lineTo(0.0, -12.0);
    ctx.lineTo(0.0, 0.0);
    ctx.lineTo(0.0, profile.height);

    let currentX = 3.0;
    cuts.forEach((cutValue, index) => {
        if(isNaN(cutValue)) cutValue = 3;
        const spacingX = profile.spacings[index] || currentX;
        const cutDepthY = profile.height - (cutValue * profile.depthStep + 1.2);

        ctx.lineTo(spacingX - 1.0, profile.height);
        ctx.lineTo(spacingX, cutDepthY);
        ctx.lineTo(spacingX + 1.0, profile.height);
    });

    ctx.lineTo(profile.length, profile.height);
    ctx.lineTo(profile.length, 0.0);
    ctx.lineTo(profile.length, -5.0);
    ctx.lineTo(-profile.bowLength, -15.0);
    ctx.closePath();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fill();
    ctx.lineWidth = 1.5 / (pixelsPerMm * 0.25);
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    ctx.font = 'bold 3.5px sans-serif';
    ctx.fillStyle = '#f43f5e';
    ctx.textAlign = 'center';
    cuts.forEach((cutValue, index) => {
        if(!isNaN(cutValue)) {
            const spacingX = profile.spacings[index] || (3.0 + index * 4);
            ctx.fillText(cutValue, spacingX, profile.height + 4.5);
        }
    });

    ctx.restore();
}

function setupDraggableOverlay() {
    const overlay = document.getElementById('draggable-overlay');
    const header = document.getElementById('overlay-header');
    let isDragging = false, startX, startY;

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - overlay.offsetLeft;
        startY = e.clientY - overlay.offsetTop;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        overlay.style.left = `${e.clientX - startX}px`;
        overlay.style.top = `${e.clientY - startY}px`;
        overlay.style.position = 'fixed';
    });

    document.addEventListener('mouseup', () => { isDragging = false; });
}

function downloadSTL() {
    if (!keyMesh) return;

    const exporter = new THREE.STLExporter();
    const stlString = exporter.parse(keyMesh, { binary: true });

    const blob = new Blob([stlString], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'custom_key.stl';
    link.click();
}
