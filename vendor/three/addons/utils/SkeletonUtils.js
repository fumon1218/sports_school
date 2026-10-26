/* 대체 파일: 원본 SkeletonUtils는 뼈대(skin) 복제용입니다.
   이 앱의 3D 모델에는 뼈대가 없어서 Object3D.clone()만으로 충분합니다. */
export function clone( source ) { return source.clone(); }
