let scene, camera, renderer, keyMesh;
let pixelsPerMm = 3.78; // Default CSS pixels per mm baseline (~96 DPI)

// Initialize application
init3D();
setupEvents();
generateKey();

function init3D() {
    const container = document.getElementById('canvas-container');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    // Camera setup
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, -60, 80);
    camera.up.set(0, 0, 1); // Z-up orientation for 3D printing alignment
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, -40, 50);
    scene.add(dirLight);

    // Handle window resizing
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
    // Calibration Slider handler
    const slider = document.getElementById('scale-slider');
    const calBox = document.getElementById('calibration-box');
    
    slider.addEventListener('input', (e) => {
        const val = e.target.value;
        // Standard credit card width is 85.6 mm
        const targetWidthMm = 85.6;
        const basePixels = targetWidthMm * 3.78; 
        const currentPixels = basePixels * (val / 100);
        calBox.style.width = `${currentPixels}px`;
        pixelsPerMm = 3.78 * (val / 100);
    });

    document.getElementById('generate-btn').addEventListener('click', generateKey);
    document.getElementById('download-btn').addEventListener('click', downloadSTL);
}

function generateKey() {
    // Remove previous key mesh if it exists
    if (keyMesh) scene.remove(keyMesh);

    const keyType = document.getElementById('key-type').value;
    const bittingStr = document.getElementById('bitting-input').value;
    const cuts = bittingStr.split('').map(Number);

    // Create a 2D Shape profile for extrusion
    const keyShape = new THREE.Shape();

    // Dimensions in mm (Approximations for standard keys)
    const bladeLength = 50.0;
    const bladeHeight = 8.5;
    const shoulderX = 0.0; // Point where cuts start relative to stop
    const thickness = 2.2;  // Standard key blade thickness

    // Draw base key body outline
    keyShape.moveTo(shoulderX - 15.0, -5.0); // Bow / handle connection base area stub
    keyShape.lineTo(shoulderX, -5.0);
    keyShape.lineTo(shoulderX, bladeHeight);   // Shoulder stop reference

    // Generate top edge cuts based on bitting code
    // Standard pin spacing steps from shoulder (in mm)
    const pinSpacings = keyType === 'schlage' 
        [5.56, 9.14, 12.72, 16.30, 19.88] 
        [5.84, 10.36, 14.88, 19.40, 23.92]; // Kwikset approximations
    
    const depthStep = 0.38; // Depth factor per cut increment

    let currentX = shoulderX + 4.0;
    cuts.forEach((cutValue, index) => {
        if(isNaN(cutValue)) cutValue = 3;
        const spacingX = shoulderX + pinSpacings[index] || (currentX + index * 3.8);
        const cutDepthY = bladeHeight - (cutValue * depthStep + 1.5);

        // Draw V-Notch profile for each pin cut position
        keyShape.lineTo(spacingX - 1.2, bladeHeight);
        keyShape.lineTo(spacingX, cutDepthY);
        keyShape.lineTo(spacingX + 1.2, bladeHeight);
    });

    // Finish blade tip and return back to origin
    keyShape.lineTo(shoulderX + bladeLength, bladeHeight);
    keyShape.lineTo(shoulderX + bladeLength, 0.0);
    keyShape.lineTo(shoulderX - 15.0, 0.0);
    keyShape.closePath();

    // Extrude settings to convert 2D shape into a 3D printable solid
    const extrudeSettings = {
        steps: 1,
        depth: thickness,
        bevelEnabled: true,
        bevelThickness: 0.2,
        bevelSize: 0.2,
        bevelSegments: 2
    };

    const geometry = new THREE.ExtrudeGeometry(keyShape, extrudeSettings);
    // Center geometry for better rotation view
    geometry.center();

    const material = new THREE.MeshStandardMaterial({ 
        color: 0x94a3b8, 
        metalness: 0.8, 
        roughness: 0.3 
    });

    keyMesh = new THREE.Mesh(geometry, material);
    // Rotate so flat face lays nicely along view plane initially
    keyMesh.rotation.x = Math.PI / 2;
    scene.add(keyMesh);

    // Enable download button
    document.getElementById('download-btn').removeAttribute('disabled');
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
