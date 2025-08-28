# ePiE_gui
Desktop gui app for the ePiE model Windows compile documentation.

## setup project
```
nvm install 16.13.0
nvm use 16.13.0
nodist global 16.13.0
nodist npm global 6.12.1
npm install electron@v31.1.0
npm install -g @vue/cli
vue create <projectname>
# select:  Default ([Vue 3] babel, eslint)
# select: yarn
yarn config set ignore-engines true
vue add electron-builder
yarn add bootstrap@next
yarn add @electron/remote
```

## testing
```
yarn electron:serve
```

## building
```
# rmdir /s node_modules
yarn electron:build
```


## switch off debugging mode (production)
```css
/* styles.css */
.debugging{
  color: orange !important;
  display: none;
}
/* styles.css */
.debugging > button{
  color: orange !important;
  display: none;
}
```

```javascript
// backgound.js
// uncomment the line below: win.loadURL('app://./index.html')
win.webContents.openDevTools()
```

