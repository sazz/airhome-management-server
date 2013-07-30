
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { speakers: [ { title: "Wohnzimmer", ip: "192.168.1.100",	id: "livingroom" },
                                    { title: "Arbeitszimmer", ip: "192.168.1.102", id: "workingroom"}],
                        channels: [ { title: "Antenne Bayern", id: "antbayern", selected: false},
                                    { title: "EGO.FM", id: "egofm", selected: true}]
  });
};