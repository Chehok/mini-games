/* 참가자 ID로 같은 이름도 구분해요. 홀수 인원의 마지막 한 명은 자동 진출해요. */
(function (root) {
  'use strict';
  root.BracketLogic = {
    makeRound: function (players) {
      var matches = [];
      for (var i = 0; i < players.length; i += 2) {
        var pair = players.slice(i, i + 2);
        matches.push({players: pair, winner: pair.length === 1 ? pair[0].id : null});
      }
      return matches;
    },
    winners: function (matches) {
      return matches.map(function (match) { return match.players.find(function (p) { return p.id === match.winner; }); });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
