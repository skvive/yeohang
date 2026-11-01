# 여행갈지도 Android 에뮬레이터 실험 환경

현재 GitHub Actions는 JDK 17, Android SDK API 36, Build Tools 36.0.0, Gradle 8.13을 설치하고 KVM 가속으로 Android 15(API 35) 에뮬레이터를 부팅합니다.

## 테스트 앱과 실제 제품 구분
- `android-lab/smoke`: 환경 검사 전용 샘플 앱. **여행갈지도 v8 본 앱이 아닙니다.** 이 APK로 ADB 설치·실행·화면 캡처·크래시 여부를 검증합니다.
- `android-app`: 사용자가 보유한 v8 ZIP에 포함된 정식 앱 소스. 현재 `skvive/yeohang`에는 미등록이므로 이 GitHub Actions에서는 **v8 앱 설치 검증을 실행할 수 없습니다**.

## v8 실제 앱 설치를 이어가는 방법
v8 ZIP의 `YEOHAENG_GALJIDO_KIMBYEOL_ANDROID_V8/android-app/` 폴더를 별도 작업 브랜치의 저장소 루트 `android-app/`로 이식합니다. 바이너리 이미지는 Git LFS 또는 승인된 비공개 아티팩트 공유 경로를 사용하세요. API 키·서명 키·Neon URL 등 비밀 값은 저장소에 커밋하지 마세요.

이후 워크플로의 Gradle `:app:assembleMapsLinkDebug` 빌드와 `adb install -r`, `am start`, AndroidRuntime 오류 로그 및 스크린샷을 검증합니다. 앱이 실제 제공처/지도 타일과 연동되는지 여부는 별도 E2E가 필요합니다.

## 실험 결과를 확인할 곳
GitHub Actions → `Android Emulator Lab - SDK and AVD Smoke` → `yeohang-android-emulator-lab-evidence` 아티팩트.

환경에서 사용하는 에뮬레이터는 일회성 CI 실행기이며 앱 설치 상태가 다음 실행으로 보존되는 영구 가상머신이 아닙니다.
