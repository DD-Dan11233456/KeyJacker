let scene, camera, renderer, keyMesh;
let pixelsPerMm = 3.78; 
let appVersionCounter = 103; 

const keyProfiles = {
    // US / Standard Profiles
    schlage: { name: "Schlage SC1 (5-Pin)", pins: 5, length: 52.0, height: 8.5, bowLength: 22.0, spacings: [5.56, 9.14, 12.72, 16.30, 19.88], depthStep: 0.38 },
    kwikset: { name: "Kwikset KW1 (5-Pin)", pins: 5, length: 53.0, height: 8.2, bowLength: 23.0, spacings: [5.84, 10.36, 14.88, 19.40, 23.92], depthStep: 0.45 },
    yale:    { name: "Yale Y1 (5-Pin)", pins: 5, length: 50.0, height: 8.0, bowLength: 22.0, spacings: [5.00, 9.00, 13.00, 17.00, 21.00], depthStep: 0.35 },
    master:  { name: "Master Lock M1 (4-Pin)", pins: 4, length: 42.0, height: 7.5, bowLength: 18.0, spacings: [6.00, 10.50, 15.00, 19.50], depthStep: 0.40 },
    corbin:  { name: "Corbin 60 (5-Pin)", pins: 5, length: 51.0, height: 8.6, bowLength: 21.0, spacings: [5.30, 9.50, 13.70, 17.90, 22.10], depthStep: 0.38 },
    weiser:  { name: "Weiser WR5 (5-Pin)", pins: 5, length: 52.0, height: 8.2, bowLength: 22.0, spacings: [5.80, 10.30, 14.80, 19.30, 23.80], depthStep: 0.42 },
    
    // European Standard Profiles (DIN / Euro-cylinder specs)
    ces:     { name: "CES Euro (5-Pin)", pins: 5, length: 48.5, height: 8.0, bowLength: 20.0, spacings: [4.5, 8.5, 12.5, 16.5, 20.5], depthStep: 0.36 },
    bks:     { name: "BKS Euro (5-Pin)", pins: 5, length: 50.0, height: 8.3, bowLength: 21.0, spacings: [5.0, 9.2, 13.4, 17.6, 21.8], depthStep: 0.40 },
    wilka:   { name: "Wilka Euro (5-Pin)", pins: 5, length: 49.0, height: 8.1, bowLength: 20.5, spacings: [4.8, 8.9, 13.0, 17.1, 21.2], depthStep: 0.38 },
    dom:     { name: "DOM RS Standard (6-Pin)", pins: 6, length: 54.0, height: 8.5, bowLength: 22.0, spacings: [4.0, 8.0, 12.0, 16.0, 20.0, 24.0], depthStep: 0.35 }
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
    const versionStr = `App Build Version: ${major}.${minor}.${patch}`;
    const versionEl = document.getElementById('version-text');
    if (versionEl) versionEl.innerText = versionStr;
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
        const inputElem = document.getElementById('bitting-input');
        inputElem.maxLength = profile.pins;
        inputElem.value = "3".repeat(profile.pins);
        document.getElementById('bitting-hint').innerText = `Enter ${profile.pins} digits for ${profile.name}`;
        generateKey();
        bumpVersion();
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

    keyShape.absarc(-bowLen / 2, -2.0, 11.0, 0, Math.PI * 2, false);

    const bridgeStartX = -bowLen;

    keyShape.moveTo(shoulderX, -12.0);
    keyShape.lineTo(shoulderX, 0.0);
    keyShape.lineTo(shoulderX, bladeHeight);

    let currentX = shoulderX + 3.0;
    cuts.forEach((cutValue, index) => {
        if(isNaN(cutValue)) cutValue = 3;
        const spacingX = shoulderX + (profile.spacings[index] || currentX);
        const cutDepthY = bladeHeight - (cutValue * profile.depthStep + 1.2);

        keyShape.lineTo(spacingX - 0.8, bladeHeight);
        keyShape.lineTo(spacingX, Math.max(cutDepthY, 1.0));
        keyShape.lineTo(spacingX + 0.8, bladeHeight);
    });

    keyShape.lineTo(shoulderX + profile.length, bladeHeight);
    keyShape.lineTo(shoulderX + profile.length, 0.0);
    keyShape.lineTo(shoulderX + profile.length, -5.0);
    keyShape.lineTo(bridgeStartX, -12.0);
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
}

function draw2DOverlay() {
    const canvas = document.getElementById('overlay-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const profileKey = document.getElementById('key-type').value;
    const profile = keyProfiles[profileKey];
    const bittingStr = document.getElementById('bitting-input').value;
    const cuts = bittingStr.split('').map(Number);

    const totalLenMm = profile.length + profile.bowLength + 10;
    const totalHeightMm = profile.height + 25; 

    canvas.width = totalLenMm * pixelsPerMm;
    canvas.height = totalHeightMm * pixelsPerMm;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.scale(pixelsPerMm, pixelsPerMm);
    ctx.translate(profile.bowLength + 5, profile.height + 12);

    ctx.beginPath();
    ctx.arc(-profile.bowLength / 2, -2.0, 11.0, 0, 2 * Math.PI);
    
    ctx.moveTo(0.0, -12.0);
    ctx.lineTo(0.0, 0.0);
    ctx.lineTo(0.0, profile.height);

    let currentX = 3.0;
    cuts.forEach((cutValue, index) => {
        if(isNaN(cutValue)) cutValue = 3;
        const spacingX = profile.spacings[index] || currentX;
        const cutDepthY = profile.height - (cutValue * profile.depthStep + 1.2);

        ctx.lineTo(spacingX - 0.8, profile.height);
        ctx.lineTo(spacingX, Math.max(cutDepthY, 1.0));
        ctx.lineTo(spacingX + 0.8, profile.height);
    });

    ctx.lineTo(profile.length, profile.height);
    ctx.lineTo(profile.length, 0.0);
    ctx.lineTo(profile.length, -5.0);
    ctx.lineTo(-profile.bowLength, -12.0);
    ctx.closePath();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
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

    if (!overlay || !header) return;

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
