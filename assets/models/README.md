# 3D 모델 (glb) 폴더

파일 이름은 `js/config.js`에 적힌 이름과 같아야 하고, 같은 이름으로 바꿔 넣으면 코드 수정 없이 교체됩니다.
없는 파일은 임시 도형으로 보입니다 (브라우저 콘솔의 404는 정상).

| 파일 | 용도 |
|---|---|
| gym / teacher / dorm / pool / hall / expo | 체육관 / 교사동 / 생활관 / 수영장동 / 다목적관 / 전시관 |
| gate / stadium | 정문 / 운동장 |
| pingpong / tennis / hurdles / boxing / judo | 체험 구역(탁구·테니스·육상·태권도·유도) |
| patio / trophy / holosign / racer | 장식 소품 |
| tree_cherry / portal / pin | 벚나무 / 체육관 입장 포털 / 목표 핀 |
| boy / wheelchair | 주인공 캐릭터 |
| medals | (아직 월드에 배치하지 않음) |
| `nature/` | 열린 자연 지대(나무·바위·꽃 등). 아래 참고 |

## 크기·방향 맞추기
- 모델은 `size`(가장 긴 변)에 맞춰 자동으로 크기가 조절되고, 바닥이 y=0, 가운데가 자리에 오도록 정렬됩니다.
- 앞면이 남쪽(화면 아래)을 보지 않으면 `rotY`를 90·180·270으로 바꿉니다.
- 용량은 파일 하나에 0.3~1MB(저폴리, 질감 1024px 이하)를 권장합니다.

## nature/ 폴더 (열린 자연 지대)
`tree_a, tree_b, pine, bush, rock_a, rock_b, flower, log` (.glb)를 넣으면 숲과 들판에 자동으로 흩뿌려집니다. 개수와 크기는 `js/config.js`의 `NATURE`에서 정합니다.
