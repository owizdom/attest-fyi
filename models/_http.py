import json
import urllib.request


def post(url, body, headers, timeout=120):
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                 headers=headers, method="POST")
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def get(url, headers=None, timeout=60):
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    return json.load(urllib.request.urlopen(req, timeout=timeout))
