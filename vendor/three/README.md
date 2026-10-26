# three.js r186 (MIT)
옥쌤의 즐거운 교실 3D 체스에 쓰는 three.js r186 파일입니다. 오프라인·학교망에서도 되도록 저장소에 함께 둡니다.

- `three.module.js`, `three.core.js`: 본체 (build 폴더 원본)
- `addons/loaders/GLTFLoader.js`, `addons/utils/BufferGeometryUtils.js`, `addons/controls/OrbitControls.js`: examples/jsm 원본.
  `import ... from 'three'` 한 줄만 `'../../three.module.js'` 로 바꿨습니다(import map 없이 동작하도록).
- `addons/utils/SkeletonUtils.js`: 원본 대신 만든 작은 대체 파일(이 앱 모델에는 뼈대가 없어 `clone()`만 필요).
