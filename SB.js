SB = {};

// Function setup

Map.prototype.toJSON = function() {
    return Array.from(this.entries());
};

class MapIO {
    constructor(id) {
		this.id = id;
		this.map = SB.localconfig[this.id];
    }

    set(key, value) {
        this.map.set(key, value);

        SB.config.handler.set(undefined, this.id, encodeStoredItem(this.map));

		return this.map;
    }
	
	get(key) {
		return this.map.get(key);
    }
	
	has(key) {
		return this.map.has(key);
    }
	
	deleteProperty(key) {
		if (this.map.has(key)) {
			this.map.delete(key);
			return true;
		} else {
			return false;
		}
	}
	
	size() {
		return this.map.size;
    }
	
	delete(key) {
		this.map.delete(key);
        
        SB.config.handler.set(undefined, this.id, encodeStoredItem(this.map));
    }
}

/**
 * A Map cannot be stored in the chrome storage. 
 * This data will be encoded into an array instead as specified by the toJSON function.
 * 
 * @param {*} data 
 */
function encodeStoredItem(data) {
	if(!(data instanceof Map)) return data;
	return JSON.stringify(data);
}

/**
 * A Map cannot be stored in the chrome storage. 
 * This data will be decoded from the array it is stored in
 * 
 * @param {*} data 
 */
function decodeStoredItem(data) {
    if(typeof data !== "string") return data;
    
	try {
        let str = JSON.parse(data);
        
		if(!Array.isArray(str)) return data;
		return new Map(str);
    } catch(e) {

        // If all else fails, return the data
        return data;
    }
}

function configProxy() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        for (key in changes) {
            SB.localconfig[key] = decodeStoredItem(changes[key].newValue);
        }
    });
	
    var handler = {
        set: function(obj, prop, value) {
            SB.localconfig[prop] = value;

            chrome.storage.sync.set({
                [prop]: encodeStoredItem(value)
            });
        },
        get: function(obj, prop) {
            let data = SB.localconfig[prop];
            if(data instanceof Map) data = new MapIO(prop);

			return obj[prop] || data;
        }
		
    };

    return new Proxy({handler}, handler);
}

function fetchConfig() { 
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(null, function(items) {
            SB.localconfig = items;  // Data is ready
            resolve();
        });
    });
}

function migrateOldFormats() { // Convert sponsorTimes format
    for (key in SB.localconfig) {
        if (key.startsWith("sponsorTimes") && key !== "sponsorTimes" && key !== "sponsorTimesContributed") {
            SB.config.sponsorTimes.set(key.substr(12), SB.config[key]);
            delete SB.config[key];
        }
    }
}

async function setupConfig() {
    await fetchConfig();
	addDefaults();
	convertJSON();
	SB.config = configProxy();
    migrateOldFormats();
}

SB.defaults = {
	"sponsorTimes": new Map(),
	"startSponsorKeybind": ";",
	"submitKeybind": "'",
	"minutesSaved": 0,
	"skipCount": 0,
	"sponsorTimesContributed": 0,
	"disableSkipping": false,
	"disableAutoSkip": false,
	"trackViewCount": true,
	"dontShowNotice": false,
	"hideVideoPlayerControls": false,
	"hideInfoButtonPlayerControls": false,
	"hideDeleteButtonPlayerControls": false,
	"hideDiscordLaunches": 0,
	"hideDiscordLink": false
}

// Reset config
function resetConfig() {
	SB.config = SB.defaults;
};

function convertJSON() {
	Object.keys(SB.defaults).forEach(key => {
		SB.localconfig[key] = decodeStoredItem(SB.localconfig[key], key);
	});
}

// Add defaults
function addDefaults() {
	Object.keys(SB.defaults).forEach(key => {
		if(!SB.localconfig.hasOwnProperty(key)) {
			SB.localconfig[key] = SB.defaults[key];
		}
	});
};

// Sync config
setupConfig();
