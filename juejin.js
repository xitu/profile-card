// @see https://docs.aircode.io/guide/functions/
const aircode = require('aircode');
const StateCard = require('./cards/state-card');
const fetch = require('node-fetch');

const api = 'https://api.juejin.cn/user_api/v1/user/get';

module.exports = async function (params, context) {
  const {uid} = params;
  if(!uid) {
    context.status(400);
    return {error: 'invalid user'};
  }

  const {data:userInfo} = await (await fetch(`${api}?user_id=${uid}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json; charset=utf-8',
    }
  })).json();

  const cardSvg = new StateCard({
    title: `${userInfo.user_name}的掘金数据`,
    ...params
  });

  cardSvg.addStats({
    icon: 'write_article',
    label: '创作文章数',
    value: userInfo.post_article_count,
  });

  cardSvg.addStats({
    icon: 'pub_tweet',
    label: '发布沸点数',
    value: userInfo.post_shortmsg_count,
  });

  cardSvg.addStats({
    icon: 'read_article',
    label: '阅读文章数',
    value: userInfo.view_article_count,
    number_format: userInfo.view_article_count >= 10000 ? 'short' : 'long',
  });

  cardSvg.addStats({
    icon: 'thumb_up',
    label: '文章被点赞数',
    value: userInfo.got_digg_count,
    number_format: userInfo.got_digg_count >= 10000 ? 'short' : 'long',
  });

  cardSvg.addStats({
    icon: 'user_level',
    label: '掘友分',
    value: userInfo.user_growth_info.jscore,
    number_format: userInfo.user_growth_info.jscore >= 10000 ? 'short' : 'long',
  });

  const percentile = 100 - (userInfo.user_growth_info.jscore - userInfo.user_growth_info.jscore_this_level_mini_score) / (
    userInfo.user_growth_info.jscore_next_level_score
    - userInfo.user_growth_info.jscore_this_level_mini_score
  ) * 100;
  cardSvg.setRank({
    level: userInfo.user_growth_info.jscore_level,
    percentile,
  });
  
  context.set('Content-Type', 'image/svg+xml');
  return cardSvg.render();
};
