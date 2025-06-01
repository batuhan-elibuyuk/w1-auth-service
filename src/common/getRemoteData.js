const axios = require("axios");
const fs = require("fs");

const sendRestRequest = async (
  url,
  bearer,
  headers,
  cookies,
  body,
  query,
  method,
  serializer,
) => {
  const request = { url: url, method: method };
  if (bearer || cookies) request.headers = {};
  if (headers) request.headers = headers;
  if (bearer) {
    request.headers.Authorization = `Bearer ${bearer}`;
  }
  if (cookies) {
    let cookieHeader = "";
    for (const key of Object.keys(cookies)) {
      const cookie = `${key}=${cookies[key]};`;
      if (cookieHeader != "") cookieHeader += " ";
      cookieHeader += cookie;
    }
    request.headers.Cookie = cookieHeader;
  }

  if (body) {
    request.data = body;
  }
  if (query) {
    request.params = query;
  }

  try {
    const result = await axios(request);
    const data = result ? result.data : null;
    return serializer ? { data, serializer } : data;
  } catch (err) {
    if (err.response && err.response.status == 404)
      return serializer ? { data: null, serializer } : null;
    console.log(
      "sendRestRequest Error: ",
      err.response ? err.response.status : 0,
      url,
    );
    throw err;
    //return err;
  }
};

const getRestData = async (url, auth, serializer) => {
  const options = auth
    ? {
        headers: { Authorization: `Bearer ${auth}` },
      }
    : null;
  try {
    const result = await axios.get(url, options);
    const data = result ? result.data : null;

    return serializer ? { data, serializer } : data;
  } catch (err) {
    if (err.response && err.response.status == 404)
      return serializer ? { data: null, serializer } : null;
    console.log(
      "getRestData Error: ",
      err.response ? err.response.status : 0,
      url,
    );
    //throw err;
    return err;
  }
};

const downloadFile = async (src, dest) => {
  // axios download with response type "stream"
  return await axios({
    method: "GET",
    url: src,
    responseType: "stream",
  })
    .then(function (response) {
      if (response && response.status === 200 && response.data) {
        let writer = fs.createWriteStream(dest);

        // pipe the result stream into a file on disc
        response.data.pipe(writer);

        // return a promise and resolve when download finishes
        return new Promise((resolve, reject) => {
          writer.on("finish", () => {
            resolve(true);
          });

          writer.on("error", (error) => {
            reject(error);
          });
        });
      }
    })
    .catch(function (e) {
      throw new Error(e);
    });
};

module.exports = { getRestData, sendRestRequest, downloadFile };
