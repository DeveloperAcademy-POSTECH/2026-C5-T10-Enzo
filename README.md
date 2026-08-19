# 씬킷에서 리얼리티킷으로

개발자가 선언한 닫힌 SceneKit 세계에서 출발해, 현실을 읽는 Spatial Computing으로 넘어가는 과정을 설명하는 DocC 튜토리얼입니다.

## 로컬 빌드

Xcode가 설치된 macOS에서 아래 명령을 실행하면 GitHub Pages용 정적 DocC 아카이브를 만들 수 있습니다.

```bash
bash scripts/build-docc-site.sh /tmp/SceneKitToRealityKit.doccarchive
```

## 배포

`main`의 DocC 원본 또는 배포 설정 변경은 GitHub Actions에서 정적 아카이브로 변환되어 GitHub Pages에 배포됩니다. 배포 주소는 다음 형식을 사용합니다.

```text
https://developeracademy-postech.github.io/2026-C5-T10-Enzo/
```

`--hosting-base-path /2026-C5-T10-Enzo`는 프로젝트 페이지의 하위 경로에서도 DocC의 스타일·스크립트·튜토리얼 링크가 올바르게 로드되도록 합니다.
