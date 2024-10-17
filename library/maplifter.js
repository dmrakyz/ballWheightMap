import * as THREE from 'three';
import * as CANNON from 'cannon';

export function createHeightfield(texturePath, width = 256, height = 256, heightScale = 50) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(texturePath, (texture) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const image = texture.image;

            canvas.width = image.width;
            canvas.height = image.height;
            context.drawImage(image, 0, 0);

            // Extract pixel data
            const imageData = context.getImageData(0, 0, image.width, image.height);
            const pixels = imageData.data;

            // Create plane geometry
            const planeGeo = new THREE.PlaneGeometry(width, height, image.width - 1, image.height - 1);

            // Modify vertices based on grayscale values
            for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
                const grayscaleValue = pixels[i] / 255; // Normalize to [0, 1]
                planeGeo.attributes.position.setZ(j, grayscaleValue * heightScale); // Scale height
            }

            // Update geometry
            planeGeo.computeVertexNormals();

            // Create a mesh with basic material
            const material = new THREE.MeshStandardMaterial({ color: 0x88cc88 });
            const heightMapMesh = new THREE.Mesh(planeGeo, material);

            // Resolve the promise with the created mesh
            resolve(heightMapMesh);
        }, undefined, (error) => {
            reject(error);
        });
    });
}

export function createCannonHeightfield(threeMesh, heightScale = 50) {
    const shape = new CANNON.Heightfield(
        getHeightfieldData(threeMesh.geometry.attributes.position.array, threeMesh.geometry.parameters.widthSegments + 1, heightScale),
        {
            elementSize: heightScale / (threeMesh.geometry.parameters.heightSegments),
        }
    );
    return shape;
}

function getHeightfieldData(positionArray, widthSegments, heightScale) {
    const data = [];
    for (let i = 0; i < positionArray.length; i += 3) {
        const z = positionArray[i + 2]; // Get the Z position
        data.push(z / heightScale); // Normalize the height values
    }
    // Create a 2D array for Cannon.js
    const heightfieldData = [];
    for (let i = 0; i < data.length; i += widthSegments) {
        heightfieldData.push(data.slice(i, i + widthSegments));
    }
    return heightfieldData;
}