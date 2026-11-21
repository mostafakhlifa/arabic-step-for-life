// Consistent API envelope (see API_CONTRACT.md):
//   success → { success: true, data }
//   failure → { success: false, error }
function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

module.exports = { ok, fail };
