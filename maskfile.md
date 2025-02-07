## build

```sh
rm -R build
mkdir build
cp picts/appicon.png build
cd frontend
yarn run build

## wails build --platform "darwin/universal"
wails build -s
```
