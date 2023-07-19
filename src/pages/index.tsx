import Head from 'next/head';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import styles from '@/styles/Home.module.css';

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const hoveredObjectRef = useRef<THREE.Mesh | null>(null);

  const originalMaterials = useRef<THREE.Material[]>([]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor(0x000000, 0);

    // Assign scene and camera to refs so they can be used in the callback
    sceneRef.current = scene;
    cameraRef.current = camera;

    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);

    // Add Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    // Load the materials first
    const mtlLoader = new MTLLoader();
    mtlLoader.load('/obj/output.obj.mtl', (materials) => {
      materials.preload();

      // Use the OBJLoader to load the OBJ file
      const loader = new OBJLoader();
      loader.setMaterials(materials);
      loader.load(
        '/obj/output.obj',
        function (object) {
          // Scale and position the model
          const scale = 0.02;

          object.scale.set(scale, scale, scale); // Adjust this scale as needed
          object.position.set(0, 0, 0);

          // When the model is loaded, add it to the scene
          scene.add(object);
        },
        undefined,
        function (error) {
          console.error(error);
        }
      );
    });

    // Position the camera and point it at the center of the scene
    camera.position.set(5, 5, 5);
    camera.lookAt(scene.position);

    const animate = function () {
      requestAnimationFrame(animate);

      // Update controls in the animation loop
      controls.update();

      renderer.render(scene, camera);
    };

    animate();

    // Add event listener for mouse move
    const onDocumentMouseMove = (event: MouseEvent) => {
      event.preventDefault();

      if (!sceneRef.current || !cameraRef.current) return;

      // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Raycaster
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      // Calculate objects intersecting the picking ray
      const intersects = raycaster.intersectObjects(
        sceneRef.current.children,
        true
      );

      // If we're currently hovering an object, restore its original color and stop hovering it
      if (
        hoveredObjectRef.current &&
        Array.isArray(hoveredObjectRef.current.material) &&
        originalMaterials
      ) {
        hoveredObjectRef.current.material = originalMaterials.current;
        hoveredObjectRef.current = null;
        originalMaterials.current = [];
      }

      if (intersects.length > 0) {
        const firstObject = intersects[0].object as THREE.Mesh;

        if (Array.isArray(firstObject.material)) {
          // Save original materials
          originalMaterials.current = firstObject.material;

          // Clone materials and change color
          firstObject.material = firstObject.material.map((material) => {
            const clonedMaterial = material.clone();
            if ('color' in clonedMaterial) {
              (clonedMaterial as THREE.MeshPhongMaterial).color.set(0xff0000); // Red color
            }
            return clonedMaterial;
          });

          hoveredObjectRef.current = firstObject;
        }
      }
    };

    // Add event listener for mouse move
    document.addEventListener('mousemove', onDocumentMouseMove, false);

    return () => {
      renderer.dispose();
      document.removeEventListener('mousemove', onDocumentMouseMove);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <Head>
        <title>City Scene</title>
        <meta
          name='description'
          content='Prototyping for the 3D scene'
        />
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1'
        />
        <link
          rel='icon'
          href='/favicon.ico'
        />
      </Head>
      <div
        className={styles.element}
        ref={mountRef}
      />
    </>
  );
}
