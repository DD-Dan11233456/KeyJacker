let scene, camera, renderer, keyMesh;
let pixelsPerMm = 3.78; // Baseline pixels per mm (~96 DPI)

// Key Profile Database (Spacing, depths, pin counts)
const keyProfiles = {
    schlage: { name: "Schlage SC1", pins: 5, length: 50.0, height: 8.5, spacings: [5.56, 9.14, 12.72, 16.30, 19.88], depthStep: 0.38 },
    kwikset: { name: "Kwikset KW1", pins: 5, length: 51.5, height: 8.2, spacings: [5.84, 10.36, 14.88, 19.40, 23.92], depthStep: 0.45 },
    yale:    { name: "Yale Y1", pins: 5, length: 48.0, height: 8.0, spacings: [5.00, 9.00, 13.00, 17.00, 21.00], depthStep: 0.35 },
    master:  { name: "Master Lock M1", pins: 4, length: 40.0, height: 7.5, spacings: [6.00, 10.50, 15.00, 19.50], depthStep: 0.40 }
};

init3D();
setupEvents();
generateKey();

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
    const overlayElement = document.getElementById('key-outline-overlay');
    const keyTypeSelect = document.getElementById('key-type');

    slider.addEventListener('input', (e) => {
        const val = e.target.value;
        const targetWidthMm = 85.6; // Credit card width
        const basePixels = targetWidthMm * 3.78; 
        const currentPixels = basePixels * (val / 100);
        calBox.style.width = `${currentPixels}px`;
        pixelsPerMm = 3.78 * (val / 100);
        updateScreenOverlay();
    });

    overlayToggle.addEventListener('change', (e) => {
        if(e.target.checked) {
            overlayElement.classList.remove('hidden');
            updateScreenOverlay();
        } else {
            overlayElement.classList.add('hidden');
        }
    });

    keyTypeSelect.addEventListener('change', (e) => {
        const profile = keyProfiles[e.target.value];
        document.getElementById('bitting-input').maxLength = profile.pins;
        document.getElementById('bitting-input').value = "3".repeat(profile.pins);
        document.getElementById('bitting-hint').innerText = `Enter ${profile.pins} digits for ${profile.name}`;
        generateKey();
    });

    document.getElementById('generate-btn').addEventListener('click', generateKey);
    document.getElementById('download-btn').addEventListener('click', downloadSTL);
}

function updateScreenOverlay() {
    const profileKey = document.getElementById('key-type').value;
    const profile = keyProfiles[profileKey];
    const outlineBox = document.getElementById('outline-box');

    // Scale pixel box dimensions directly from real-world millimeters using calibration ratio
    const widthPx = profile.length * pixelsPerMm;
    const heightPx = profile.height * pixelsPerMm;

    outlineBox.style.width = `${widthPx}px`;
    outlineBox.style.height = `${heightPx}px`;
}

function generateKey() {
    if (keyMesh) scene.remove(keyMesh);

    const profileKey = document.getElementById('key-type').value;
    const profile = keyProfiles[profileKey];
    const bittingStr = document.getElementById('bitting-input').value;
    const cuts = bittingStr.split('').map(Number);

    const keyShape = new THREE.Shape();
    const shoulderX = 0.0;
    const bladeHeight = profile.height;
    const thickness = 2.2;

    keyShape.moveTo(shoulderX - 15.0, -5.0);
    keyShape.lineTo(shoulderX, -5.0);
    keyShape.lineTo(shoulderX, bladeHeight);

    let currentX = shoulderX + 4.0;
    cuts.forEach((cutValue, index) => {
        if(isNaN(cutValue)) cutValue = 3;
        const spacingX = shoulderX + profile.spacings[index] || (currentX + index * 3.8);
        const cutDepthY = bladeHeight - (cutValue * profile.depthStep + 1.2);

        keyShape.lineTo(spacingX - 1.0, bladeHeight);
        keyShape.lineTo(spacingX, cutDepthY);
        keyShape.lineTo(spacingX + 1.0, bladeHeight);
    });

    keyShape.lineTo(shoulderX + profile.length, bladeHeight);
    keyShape.lineTo(shoulderX + profile.length, 0.0);
    keyShape.lineTo(shoulderX - 15.0, 0.0);
    keyShape.closePath();

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
    updateScreenOverlay();
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
