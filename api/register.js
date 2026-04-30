// api/register.js
// POST /api/register — メール/パスワード新規登録
// server.js 197-233 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../lib/vercel-utils');
const { readData, writeData, genId } = require('../lib/data-cache');
const { hashPassword } = require('../lib/auth');

// 名前×お店 重複チェック共通ヘルパ（server.js と同一）
function _normForDup(s) { return String(s || '').trim().replace(/\s+/g, '').toLowerCase(); }
function findNameShopDuplicate(members, { name, business, profession }) {
  const nName = _normForDup(name);
  const nBiz = _normForDup(business);
  const nProf = _normForDup(profession);
  if (!nName || (!nBiz && !nProf)) return null;
  return members.find((m) => {
    if (_normForDup(m.name) !== nName) return false;
    const sameBiz = nBiz && _normForDup(m.business) === nBiz;
    const sameProf = nProf && _normForDup(m.profession) === nProf;
    return sameBiz || sameProf;
  }) || null;
}
const NAME_SHOP_DUP_MSG = '同じお名前と店舗・事業内容で既に登録されています。お心当たりがある場合はログインまたはパスワード再設定をお試しください。';

async function POST(req, res) {
  try {
    const body = await readJson(req);
    const {
      email, password, name, furigana, phone,
      business, businessCategory, location, website,
      instagram, profession, homepage, googleMapUrl,
    } = body;

    if (!name || !furigana) return fail(res, 400, 'お名前とふりがなは必須です');

    const data = await readData();
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (normalizedEmail) {
      if (data.members.find((m) => (m.email || '').toLowerCase() === normalizedEmail)) {
        return fail(res, 400, 'このメールアドレスは既に登録されています');
      }
    }
    if (findNameShopDuplicate(data.members, { name, business, profession })) {
      return fail(res, 409, NAME_SHOP_DUP_MSG);
    }

    const newMember = {
      id: genId('member'),
      email: normalizedEmail,
      password: password ? await hashPassword(password) : '',
      name,
      furigana,
      phone: phone || '',
      business: business || '',
      businessCategory: businessCategory || '',
      introduction: '',
      avatar: '',
      location: location || '',
      website: website || '',
      instagram: instagram || '',
      googleMapUrl: googleMapUrl || '',
      profession: profession || '',
      homepage: homepage || '',
      sns: {},
      skills: [],
      joinDate: new Date().toISOString().split('T')[0],
      isPublic: true,
      isAdmin: false,
    };
    data.members.push(newMember);
    await writeData(data);

    const { password: _omit, ...safe } = newMember;
    return ok(res, { success: true, member: safe });
  } catch (e) {
    return handleErr(res, e, '登録に失敗しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
