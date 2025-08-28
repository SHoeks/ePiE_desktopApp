const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      builderOptions: {
        productName: "ePiE desktop application",
        appId: 'epie_app.com',
        extraFiles: {
          from: './resources/',
          to: './resources/'
        },
        win: {
          "target": [
              "nsis"
          ],
        icon: 'public/favicon.ico',
        // requestedExecutionLevel: "requireAdministrator"
        },
        "nsis": {
            "installerIcon": "public/favicon.ico",
            "uninstallerIcon": "public/favicon.ico",
            "uninstallDisplayName": "CPU Monitor",
            "license": "public/license.txt",
            "oneClick": false,
            "allowToChangeInstallationDirectory": true
        },
      }
    }
  },
  configureWebpack: {
    devtool: 'cheap-module-source-map'
  }
})
