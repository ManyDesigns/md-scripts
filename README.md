# MD Scripts

## blob fs to s3

Procedura:
- interrompere il vecchio servizio su filesystem
- migrare i blob
- riaccendere puntando S3

``` bash
docker run -it -e AWS_ACCESS_KEY_ID=<AWS_KEY> -e AWS_SECRET_ACCESS_KEY=<AWS_SECRET> -v /path/to/blobs:/blobs mitto98/md-scripts blob-to-s3
# segui i comandi su schermo
```
