# DocC GitHub Pages 배포 설계

## 목표

`SceneKitToRealityKit.docc` 카탈로그를 이 저장소에서 관리하고, `main` 변경 시 GitHub Pages에 자동으로 배포한다.

## 정적 배포 경계

- DocC 변환 결과인 HTML·CSS·JavaScript·JSON·이미지 파일만 GitHub Pages에 올린다.
- Swift 앱이나 Node 서버는 배포 환경에서 실행하지 않는다.
- 원본 DocC 카탈로그와 빌드 스크립트는 저장소에 추적하고, 변환 산출물은 Actions 아티팩트로만 전달한다.

## 경로 계약

- DocC 원본: `Tutorials/SceneKitToRealityKit.docc`
- 빌드 명령: `scripts/build-docc-site.sh`
- GitHub Pages 프로젝트 경로: `/2026-C5-T10-Enzo`
- `docc convert`는 반드시 `--hosting-base-path /2026-C5-T10-Enzo`를 사용한다.

## 배포 계약

- `.github/workflows/deploy-docc.yml`은 `main`의 DocC 관련 변경과 수동 실행에 반응한다.
- 빌드는 Xcode가 있는 macOS runner에서 수행한다.
- 배포 워크플로에는 `contents: read`, `pages: write`, `id-token: write` 권한을 명시한다.
- 배포 전 루트 HTML과 튜토리얼 JSON을 검사한다.
