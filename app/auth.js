var Client = require("ringo/httpclient").Client;
var Headers = require("ringo/utils/http").Headers;
var objects = require("ringo/utils/objects");

var defaultClient;
function getClient() {
    if (!defaultClient) {
        defaultClient = new Client(undefined, false);
    }
    return defaultClient;
}

function getGeoServerUrl(request) {
    var url;
    if (request) {
    	url = request.env.servlet.getServletConfig().getInitParameter("geoserver_url");
    }
    if (!url) {
    	url = java.lang.System.getProperty("app.proxy.geoserver");
    }
    if (url) {
        if (url.charAt(url.length-1) !== "/") {
            url = url + "/";
        }
    } else {
        url = request.scheme + "://" + request.host + (request.port ? ":" + request.port : "") + "/geoserver/";
    }
    return url;
}

function getLoginUrl(request) {
    return getGeoServerUrl(request) + "j_spring_security_check";
}

function getAuthUrl(request) {
    return getGeoServerUrl(request) + "rest";
}

// get status (ACK!) by parsing Location header
function parseStatus(exchange) {
    var status = 200;
    var location = exchange.headers.get("Location");
    if (/error=true/.test(location)) {
        status = 401;
    }
    return status;
}

exports.getStatus = function(request) {
    var url = getAuthUrl(request);
    var status = 401;
    var headers = new Headers(request.headers);
    var token = headers.get("Cookie");
    var client = getClient();
    var exchange = client.request({
        url: url,
        method: "GET",
        async: false,
        headers: headers
    });
    exchange.wait();
    return exchange.status;
};

exports.authenticate = function(request) {
    var params = request.postParams;
    var status = 401;
    var token;
    var credentials;
    if (request) {
    	credentials = {username: request.env.servlet.getServletConfig().getInitParameter("geoserver_username"), password: request.env.servlet.getServletConfig().getInitParameter("geoserver_password")};
    }
    if (credentials.username == null) {
    	credentials = {username: java.lang.System.getProperty("app.username"), password: java.lang.System.getProperty("app.password")};
    }
	//if (params.username && params.password) {
    if (credentials.username && credentials.password) {
        var url = getLoginUrl(request);
        var client = getClient();
        var exchange = client.request({
            url: url,
            method: "post",
            async: false,
            data: {
                username: credentials.username,
                password: credentials.password
            }
        });
        exchange.wait();
        status = parseStatus(exchange);
        if (status === 200) {
            var cookie = exchange.headers.get("Set-Cookie");
            if (cookie) {
                token = cookie.split(";").shift();
            }
        }
    }
    return {
        token: token,
        status: status
    }
};

