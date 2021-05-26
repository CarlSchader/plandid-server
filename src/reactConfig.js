import { millisecondMap } from "./constants";

const config = {
    url: 'http://carlschader.com',
    appName: 'Plandid',
    loginPath: "/Login",

    colors: {
        primary: {
          light:'#f05545',
          main: '#b71c1c',
          dark: '#7f0000',
          contrastText: '#ffffff',
        },
        secondary: {
          light: '#a4a4a4',
          main: '#757575',
          dark: '#494949',
          contrastText: '#000000',
        }
      },

    freeTierName: "free",
    tiers: {
        free: {
            price: 0.0,
            forwardMillis: 31 * millisecondMap.day,
            storageMillis: 14 * millisecondMap.day
        },
        premium: {
            price: 9.99,
            forwardMillis: 31 * 6 * millisecondMap.day,
            storageMillis: 365 * 2 * millisecondMap.day
        },
        "enterprise (test)": {
            price: 24.99,
            forwardMillis: 31 * 6 * millisecondMap.day,
            storageMillis: 365 * 2 * millisecondMap.day
        }
    },
    
    stripe: {
        publicKey: "pk_test_51Hn4uCG2wnzRPq5Y9xyZfvckfhUD1D8bw2izgG5oog2rBJhz7vkDLELIdOlNC3lnzPSMOOuZ1arQKieHwQFF3LkB00O2OdQSMd"
    }
};

export default config;
