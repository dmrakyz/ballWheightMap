// heightmap.js
import * as THREE from 'three';
import * as CANNON from 'cannon';

export function createHeightmap(scene, heightmapPath, scale) {
    const loader = new THREE.TextureLoader();
    
    loader.load(heightmapPath, (texture) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = texture.image.width;
        canvas.height = texture.image.height;
        context.drawImage(texture.image, 0, 0);

        const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const width = canvas.width;
        const height = canvas.height;

        // Vertex oluşturma
        const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);
        const vertices = geometry.attributes.position.array;

        // Yükseklik değerlerini uygulama
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                const index = (j * width + i) * 4; // Renk verisine erişim için index hesapla
                const heightValue = data[index] / 255 * scale; // Yükseklik değerini normalize et
                vertices[(j * width + i) * 3 + 1] = heightValue; // Y konumunu ayarla
            }
        }

        // Geometriyi güncelle
        geometry.attributes.position.needsUpdate = true; // Geometriyi güncelle
        geometry.computeVertexNormals(); // Normalleri hesapla
        const material = new THREE.MeshStandardMaterial({ color: 0x228B22, wireframe: false });
        const heightmapMesh = new THREE.Mesh(geometry, material);
        heightmapMesh.rotation.x = -Math.PI / 2; // Düzlemi döndür
        scene.add(heightmapMesh);

        // Cannon.js ile fiziksel yapı oluşturma
        const heightmapShape = new CANNON.Heightfield(
            Array.from({ length: height }, (_, j) => 
                Array.from({ length: width }, (_, i) => {
                    const index = (j * width + i) * 4; // Yükseklik verisi için index hesapla
                    return data[index] / 255 * scale; // Yükseklik değerini normalize et
                })
            ),
            { elementSize: 1 }
        );

        const heightmapBody = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(0, 0, 0) // Düzlemi başlangıç noktasına yerleştir
        });

        heightmapBody.addShape(heightmapShape);
        // Yükseklik haritasını fizik dünyasına ekle
        world.addBody(heightmapBody); // Fizik dünyasına ekle
    });
}
