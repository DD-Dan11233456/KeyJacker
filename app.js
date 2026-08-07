let scene, camera, renderer, keyMesh, controls;
let pixelsPerMm = 3.78; 
let appVersionCounter = 106; 

const keyProfiles = {
    // Anonymized Custom Profile
    generic_a: { 
        name: "Generic 5-Pin Profile A", 
        pins: 5, 
        length: 51.5, 
        height: 8.4, 
        bowLength: 21.0, 
        spacings: [5.2, 9.4, 13.6, 17.8, 22.0], 
        depthStep: 0.38 
    },
    // European Standard Profiles (DIN / Euro-cylinder specs)
    abus:    { name: "Abus C83 (5-Pin)", pins: 5, length: 50.0, height: 8.2, bowLength: 21.0, spacings: [4.9, 9.0, 13.1, 17.2, 21.3], depthStep: 0.38 },
    cisa:    { name: "CISA C2000 (5-Pin)", pins: 5, length: 51.0, height: 8.5, bowLength: 22.0, spacings: [5.0, 9.2, 13.4, 17.6, 21.8], depthStep: 0.35 },
    iseo:    { name: "ISEO F5 (5-Pin)", pins: 5, length: 50.5, height: 8.3, bowLength: 21.5, spacings: [5.1, 9.1, 13.1, 17.1, 21.1], depthStep: 0.37 },
    ces:     { name: "CES Euro (5-Pin)", pins: 5, length: 48.5, height: 8.0, bowLength: 20.0, spacings: [4.5, 8.5, 12.5, 16.5, 20.5], depthStep: 0.36 },
    bks:     { name: "BKS Euro (5-Pin)", pins: 5, length: 50.0, height: 8.3, bowLength: 21.0, spacings: [5.0, 9.2, 13.4, 17.6, 21.8], depthStep: 0.40 },
    wilka:   { name: "Wilka Euro (5-Pin)", pins: 5, length: 49.0, height: 8.1, bowLength: 20.5, spacings: [4.8, 8.9, 13.0, 17.1, 21.2], depthStep: 0.38 },
    dom:     { name: "DOM RS Standard (6-Pin)", pins: 6, length: 54.0, height: 8.5, bowLength: 22.0, spacings: [4.0, 8.0, 12.0, 16.0, 20.0, 24.0], depthStep: 0.35 },
    // US / Standard Profiles
    schlage: { name: "Schlage SC1 (5-Pin)", pins: 5, length: 52.0, height: 8.5, bowLength: 22.0, spacings: [5.56, 9.14, 12.72, 16.30, 19.88], depthStep: 0.38 },
    kwikset: { name: "Kwikset KW1 (5-Pin)", pins: 5, length: 53.0, height: 8.2, bowLength: 23.0, spacings: [5.84, 10.36, 14.88, 19.40, 23.92], depthStep: 0.45 },
    yale:    { name: "Yale Y1 (5-Pin)", pins: 5, length: 50.0, height: 8.0, bowLength: 22.0, spacings: [5.00, 9.00, 13.00, 17.00, 21.00], depthStep: 0.35 },
    master:  { name: "Master Lock M1 (4-Pin)", pins: 4, length: 42.0, height: 7.5, bowLength: 18.0, spacings: [6.00, 10.50, 15.00, 19.50], depthStep: 0.40 },
    corbin:  { name: "Corbin 60 (5-Pin)", pins: 5, length: 51.0, height: 8.6, bowLength: 21.0, spacings: [5.30, 9.50, 13.70, 17.90, 22.10], depthStep: 0.38 },
    weiser:  { name: "Weiser WR5 (5-Pin)", pins: 5, length: 52.0, height: 8.2, bowLength: 22.0, spacings: [5.80, 10.30, 14.80, 19.30, 23.80], depthStep: 0.42 }
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

    // Adjusted camera to look at the flat key natively
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, -40, 60);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Initialize OrbitControls for 360-degree viewing
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

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
    controls.update(); // Required for smooth damping
    renderer.render(scene, camera);
}

function setupEvents() {
    const slider = document.getElementById('scale-slider');
    const calBox = document.getElementById('calibration-box');
    const overlayToggle = document.getElementById('overlay-toggle');
    const overlayElement = document.getElementById('draggable-overlay');
    const closeOverlayBtn = document.getElementById('close-overlay');
    const keyTypeSelect = document.getElementById('key-type');
    const bittingInput = document.getElementById('bitting-input');

    slider.addEventListener('input', (e) => {
        const val = e.target.value;
        const targetWidthMm = 85.6; 
        const basePixels = targetWidthMm * 3.78; 
        calBox.style.width = `${basePixels * (val / 100)}px`;
        pixelsPerMm = 3.78 * (val / 100);
        draw2DOverlay();
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
        bittingInput.maxLength = profile.pins;
        bittingInput.value = "3".repeat(profile.pins);
        document.getElementById('bitting-hint').innerText = `Enter ${profile.pins} digits for ${profile.name}`;
        generateKey();
        bumpVersion();
    });

    document.getElementById('generate-btn').addEventListener('click', () => {
        generateKey();
        bumpVersion();
    });

    bittingInput.addEventListener('input', () => {
        generateKey();
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
        const spacingX = shoulderX + (profile.spacings[index] || currentX);
        const cutDepthY = bladeHeight - (cutValue * profile.depthStep + 1.2);

        keyShape.lineTo(spacingX - 0.8, bladeHeight);
        keyShape.lineTo(spacingX, Math.max(cutDepthY, 1.0));
        keyShape.lineTo(spacingX + 0.8, bladeHeight);
    });

    // Dynamic Blade Tip with Tapered Angle
    // The tip extends 5mm past the final pin cut
    const actualBladeLength = shoulderX + profile.spacings[profile.spacings.length - 1] + 5.0;

    keyShape.lineTo(actualBladeLength - 2.5, bladeHeight); // Top straight edge
    keyShape.lineTo(actualBladeLength, bladeHeight - 2.0); // Top taper down
    keyShape.lineTo(actualBladeLength, 1.5);               // Flat nose
    keyShape.lineTo(actualBladeLength - 2.5, 0.0);         // Bottom taper up (guides pins)
    
    // Return back to the shoulder along the bottom
    keyShape.lineTo(shoulderX, 0.0); 
    keyShape.lineTo(shoulderX, -5.0);
    keyShape.lineTo(bridgeStartX, -12.0);
    keyShape.closePath();

    return keyShape;
}

function generateKey() {
    if (keyMesh) scene.remove(keyMesh);

    const profileKey = document.getElementById('key-type').value;
    const profile = keyProfiles[profileKey];
    
    // Sanitize input: force numeric, default to 3s if empty, slice to max pins
    const inputElem = document.getElementById('bitting-input');
    let bittingStr = inputElem.value.replace(/\D/g, ''); 
    if (!bittingStr) bittingStr = "3".repeat(profile.pins);
    
    const cuts = bittingStr.padEnd(profile.pins, '3').split('').slice(0, profile.pins).map(Number);
    inputElem.value = cuts.join('');

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
    // ExtrudeGeometry generates on the XY plane by default. We do NOT center or rotate 
    // it so the shoulder stays locked at [0,0,0] and the key lies perfectly flat for the 3D printer bed.

    const material = new THREE.MeshStandardMaterial({ 
        color: 0x94a3b8, 
        metalness: 0.8, 
        roughness: 0.3 
    });

    keyMesh = new THREE.Mesh(geometry, material);
    scene.add(keyMesh);

    // Center camera onto the newly generated key
    controls.target.set(profile.length / 2, 0, 0);

    document.getElementById('download-btn').removeAttribute('disabled');
    draw2DOverlay();
}

function draw2DOverlay() {
    const canvas = document.getElementById('overlay-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const profileKey = document.getElementById('key-type').value;
    const profile = keyProfiles[profileKey];
    
    // Safety check for bitting input
    const bittingStr = document.getElementById('bitting-input').value.replace(/\D/g, '');
    if (!bittingStr) return;
    const cuts = bittingStr.split('').map(Number);

    // Dynamic Canvas Sizing based on real blade length
    const actualBladeLength = profile.spacings[profile.spacings.length - 1] + 5.0;
    const totalLenMm = actualBladeLength + profile.bowLength + 10;
    const totalHeightMm = profile.height + 25; 

    // HiDPI Device scaling calculation for crystal clear rendering
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = totalLenMm * pixelsPerMm;
    const logicalHeight = totalHeightMm * pixelsPerMm;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Scale context by DPR AND the user's calibration scale
    ctx.scale(dpr * pixelsPerMm, dpr * pixelsPerMm);
    ctx.translate(profile.bowLength + 5, profile.height + 12);

    ctx.beginPath();
    ctx.arc(-profile.bowLength / 2, -2.0, 11.0, 0, 2 * Math.PI);
    
    ctx.moveTo(0.0, -12.0);
    ctx.lineTo(0.0, 0.0);
    ctx.lineTo(0.0, profile.height);

    let currentX = 3.0;
    cuts.forEach((cutValue, index) => {
        const spacingX = profile.spacings[index] || currentX;
        const cutDepthY = profile.height - (cutValue * profile.depthStep + 1.2);

        ctx.lineTo(spacingX - 0.8, profile.height);
        ctx.lineTo(spacingX, Math.max(cutDepthY, 1.0));
        ctx.lineTo(spacingX + 0.8, profile.height);
    });

    // Tapered Angled Tip for 2D View
    ctx.lineTo(actualBladeLength - 2.5, profile.height);
    ctx.lineTo(actualBladeLength, profile.height - 2.0);
    ctx.lineTo(actualBladeLength, 1.5);
    ctx.lineTo(actualBladeLength - 2.5, 0.0);
    
    ctx.lineTo(0.0, 0.0);
    ctx.lineTo(0.0, -5.0);
    ctx.lineTo(-profile.bowLength, -12.0);
    ctx.closePath();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fill();
    
    // Maintain a consistent 1mm visual line width adjusted to the scale
    ctx.lineWidth = 1.0 / pixelsPerMm; 
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    ctx.font = 'bold 3.5px sans-serif';
    ctx.fillStyle = '#f43f5e';
    ctx.textAlign = 'center';
    cuts.forEach((cutValue, index) => {
        const spacingX = profile.spacings[index] || (3.0 + index * 4);
        ctx.fillText(cutValue, spacingX, profile.height + 4.5);
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
    const stlData = exporter.parse(keyMesh, { binary: true });

    // Ensure correct Blob encoding for standard STLs returned as DataViews
    const blob = new Blob([stlData.buffer || stlData], { type: 'application/vnd.ms-pki.stl' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    // Generate dynamic file name
    const profileKey = document.getElementById('key-type').value;
    const bittingStr = document.getElementById('bitting-input').value;
    link.download = `key_${profileKey}_${bittingStr}.stl`;
    
    link.click();
}
