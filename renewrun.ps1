docker buildx build --load -t bddb:latest .
if ($LASTEXITCODE -ne 0)
{
    exit $LASTEXITCODE
}

docker compose up -d bddb
if ($LASTEXITCODE -ne 0)
{
    exit $LASTEXITCODE
}
