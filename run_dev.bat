@echo off
chcp 65001 > nul
echo ========================================================
echo [알바 급여 자동 계산기] 개발 서버를 시작합니다...
echo 브라우저에서 자동으로 열립니다 (http://localhost:3000)
echo ========================================================
set PATH=C:\Program Files\nodejs;%PATH%
start http://localhost:3000
npm run dev
pause
