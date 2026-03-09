docker buildx build --load -t bddb:latest .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

docker rm -f bddb
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

docker run -d `
    --name bddb `
    --restart unless-stopped `
    -p 13000:3000 `
    -v C:/Users/zhang/.bddb:/app/data `
    -e QB_HOST=host.docker.internal:18000 `
    -e MONGO_HOST=host.docker.internal `
    bddb:latest
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
