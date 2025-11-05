$env:PATH = "C:\Users\theul\.cargo\bin;C:\Users\theul\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin;" + $env:PATH

Write-Host "Building WASM module..." -ForegroundColor Green
wasm-pack build --target web

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild successful! WASM module is ready at pkg/" -ForegroundColor Green
} else {
    Write-Host "`nBuild failed!" -ForegroundColor Red
    exit 1
}
