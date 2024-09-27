export const checkKeplrInstalled = () => {
    return typeof window.keplr !== 'undefined';
  };
  
  export const getKeplrInstallUrl = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.indexOf("chrome") > -1) {
      return "https://chrome.google.com/webstore/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap";
    } else if (userAgent.indexOf("firefox") > -1) {
      return "https://addons.mozilla.org/en-US/firefox/addon/keplr/";
    } else {
      return "https://www.keplr.app/download";
    }
  };