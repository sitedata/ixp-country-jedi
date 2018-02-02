import * as d3 from "d3";
import "../styles/eyeballsgraph.less";

let [countryCode, year, month, day] = window.location.pathname
  .match(/([a-zA-Z]{2})[\/\-]([0-9]{4})[\/\-]([0-9]{2})[\/\-]([0-9]{2})/)
  .slice(1, 6);
console.log(`country : ${countryCode}, date: ${year}-${month}-${day}`);

const SCALEFACTOR = 2;
const DATA_URL = `http://sg-pub.ripe.net/emile/ixp-country-jedi/history/${year}-${month}-${day}/${countryCode.toUpperCase()}/eyeballasgraph/asgraph.json`;
// const AS_RESOLVER_URL =
//   "https://stat.ripe.net/data/as-overview/data.json?resource=";
const schema = {
  eyeball: "eyeball_asn",
  ixp: "ixp_asn",
  transit: "transit_asn"
};
const WIDTH = 1440,
  HEIGHT = 750,
  BALL_MIN_SIZE = 2.0;

// puts eyeball asns on the outer circle
const getForceRadial = d => (d.type === "eyeball_asn" && 210) || 0;

const getForceX = d => d.type === "eyeball_asn";

const TAU = 2 * Math.PI;

const nodeClass = d =>
  (d.type === "eyeball_asn" && d.transits && "eyeball-with-transit") ||
  (d.type === "eyeball_asn_noprobe" && "eyeball-no-probe") ||
  (d.type === "eyeball_asn" && "eyeball") ||
  (d.type === "transit_asn" && "transit") ||
  (d.type === "ixp" && "ixp") ||
  "";

const resolveAsToName = async asn => {
  const fetchUrl = `${AS_RESOLVER_URL}${asn}`;
  let response = await fetch(fetchUrl);
  let data = await response.json();
  //console.log(`${asn} => ${data.data.holder}`);
  return data.data.holder;
};

const replaceAs2OrgNames = async nodes => {
  const fetchUrl = "./as2org.json";
  let response = await fetch(fetchUrl);
  let orgNames = await response.json();
  for (let node of nodes.filter(
    n => n.name && n.name.slice(0, 2) === "AS" //&&
    //n.type !== "eyeball_asn" &&
    //n.type !== "eyeball_asn_noprobe"
  )) {
    let orgName = orgNames.find(o => o.asn === node.name.replace("AS", ""));
    console.log(`inject ${orgName.name}`);
    console.log(
      document.querySelector(`text[data-asn='${node.name}']`).textContent
    );
    document.querySelector(
      `text[data-asn="${node.name}"]`
    ).textContent = orgName.name.split(/_|\.| |\,/)[0];
  }
};

// const getAllOrgNamesFromRipeStat = async nodes => {
//   for (let node of nodes.filter(
//     n =>
//       n.name.slice(0, 2) === "AS" //&&
//       //n.type !== "eyeball_asn" &&
//       //n.type !== "eyeball_asn_noprobe"
//   )) {
//     let orgName = await resolveAsToName(node.name);
//     console.log(`inject ${orgName}`);
//     console.log(
//       document.querySelector(`text[data-asn='${node.name}']`).textContent
//     );
//     document.querySelector(
//       `text[data-asn="${node.name}"]`
//     ).textContent = orgName.split(/_|\.| |\,/)[0];
//   }
// };

const getAllOrgNames = async nodes => {
  for (let node of nodes.filter(
    n => n.name.slice(0, 2) === "AS" //&&
    //n.type !== "eyeball_asn" &&
    //n.type !== "eyeball_asn_noprobe"
  )) {
    let orgName = await resolveAsToName(node.name);
    console.log(`inject ${orgName}`);
    console.log(
      document.querySelector(`text[data-asn='${node.name}']`).textContent
    );
    document.querySelector(
      `text[data-asn="${node.name}"]`
    ).textContent = orgName.split(/_|\.| |\,/)[0];
  }
};

d3.json(DATA_URL, function(error, data) {
  console.log((error && error) || "loaded without errors");

  //   getAllOrgNamesFromRipeStat(data.nodes).then(orgNames => {
  //     console.log(orgNames);
  //   });

  replaceAs2OrgNames(data.nodes);

  function ticked() {
    link.attr("d", positionLink);
    node.attr("transform", positionNode);
  }

  const positionLink = d => {
    return (
      //(d[3] === "i" &&
      //`M ${d[0].x},${d[0].y} S ${d[1].x},${d[1].y} ${d[2].x},${d[2].y}`) ||
      `M ${d[0].x},${d[0].y} A 800,800 0 0 1 ${d[2].x} ${d[2].y}`
    ); //||
    // `M ${d[0].x},${d[0].y} S 0,0 ${d[2].x} ${d[2].y}`) ||
    //   (d[0].type === "eyeball_asn" &&
    //     d[2].type === "eyeball_asn" &&
    //`M ${d[0].x},${d[0].y} A 350,350 0 0 1 ${d[2].x} ${d[2].y}`) ||
    //`M ${d[0].x},${d[0].y} A 0,0 0 0 0 ${d[2].x} ${d[2].y}`
    // );
  };
  const positionNode = d => `translate(${d.x},${d.y})`;

  const svg = d3.select("svg");

  var div = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip");

  var nodes = data.nodes,
    nodeById = d3.map(nodes, function(d) {
      return d.id;
    }),
    links = data.edges,
    bilinks = [];

  links.forEach(function(link) {
    //console.log(link.type);
    var s = (link.source = nodeById.get(link.source)),
      t = (link.target = nodeById.get(link.target)),
      //i = { index: 100, vx: 0, vy: 0, x: 0, y: 0 }; // intermediate node
      i = {};
    //console.log(i);
    nodes.push(i);
    links.push({ source: s, target: i }, { source: i, target: t });
    //link.source.type === "eyeball_asn" &&
    //  link.target.type === "transit_asn" &&
    bilinks.push([s, i, t, link.type]);
  });

  var connectedRing = d3
    .pie()
    .padAngle(0.01)
    .endAngle(
      TAU *
        (nodes
          .filter(
            d => d.type === "eyeball_asn" || d.type === "eyeball_asn_noprobe"
          )
          // calculate which percentage we're actually representing,
          // so that we can have an open ring.
          .reduce((acc, cur) => acc + cur.eyeball_pct, 0) /
          100)
    )
    .value(d => d.eyeball_pct)(
    nodes.filter(
      d => d.type === "eyeball_asn" || d.type === "eyeball_asn_noprobe"
    )
  );
  console.log(connectedRing);
  var connectedArcSegment = d3.arc().innerRadius(220);
  //.outerRadius(230);
  //.endAngle(Math.PI / 2);

  var textOutLineSegment = d3
    .arc()
    .innerRadius(245)
    .outerRadius(245);

  var eyeBallsRing = d3
    .arc()
    .innerRadius(220)
    .outerRadius(220);

  connectedRing.forEach(d => {
    const textCoords = textOutLineSegment.centroid(d);
    let group = svg
      .append("g")
      .attr(
        "class",
        (d.data.type === "eyeball_asn_noprobe" && "eyeball-no-probe") || ""
      );

    group
      .append("path")
      .attr(
        "d",
        connectedArcSegment.outerRadius(d => d.data.eyeball_pct + 220)(d)
      )
      .attr("class", "c-ring");

    group
      .append("text")
      .text(d.data.name)
      .attr("data-asn", d.data.name)
      .attr("x", textCoords[0])
      .attr("y", textCoords[1])
      .attr("text-anchor", d => textCoords[0] < 0 && "end" || textCoords[0] > 0 && "start" || "middle");
  });

  var link = svg
    //.append("g")
    .selectAll(".link")
    .data(bilinks)
    .enter()
    .append("path")
    .attr("class", d => {
      //console.log(d);
      const linkClass =
        (d[0].type === "transit_asn" &&
          d[2].type === "transit_asn" &&
          "transit-transit") ||
        (d[0].type === "eyeball_asn" && d[2].type === "ixp" && "eyeball-ixp") ||
        (d[0].type === "ixp" && d[2].type === "eyeball_asn" && "ixp-eyeball") ||
        (d[0].type === "ixp" && d[2].type === "transit_asn" && "ixp-transit") ||
        (d[0].type === "eyeball_asn" &&
          d[2].type === "transit_asn" &&
          "eyeball-transit") ||
        (d[0].type === "transit_asn" &&
          d[2].type === "eyeball_asn" &&
          "transit-eyeball") ||
        (d[0].type === "ixp" && d[2].type === "ixp" && "ixp-ixp") ||
        d[0].type;
      return `link ${linkClass} ${d[3]}`;
    });

  var node = svg
    .selectAll(".circle")
    .data(nodes.filter(d => d.id || d.id === 0))
    .enter()
    .append("g")
    .attr("class", nodeClass);

  node
    .append("circle")
    .attr("r", d => {
      const scalar =
        // (d.type === "eyeball_asn" && Math.max(d.eyeball_pct, BALL_MIN_SIZE)) ||
        // ((d.type === "transit_asn" || d.type === "ixp") &&
        d.conn_btwn_pct || BALL_MIN_SIZE;
      return Math.max(Math.log(scalar * SCALEFACTOR) * 3.5, 2);
    })
    .on("mouseover", function(d) {
      const g = d3.select(this);
      div.style("opacity", 0.9);
      div
        .html(
          `<div class="tooltip"><h4>${d.name}</h5><p>${d.eyeball_pct}</p><div>`
        )
        .attr("left", `${d.x}px`)
        .attr("top", `${d.y}px`);
    })
    .on("mouseout", function(d) {
      div.style("opacity", 0);
    });

  node
    .append("text")
    .text(
      d =>
        (d.type !== "eyeball_asn" &&
          d.type !== "eyeball_asn_noprobe" &&
          d.name) ||
        ""
    )
    .attr("data-asn", d => d.name);

  var simulation = d3
    .forceSimulation()
    .force(
      "charge",
      d3.forceCollide().radius(d => (d.type !== "eyeball_asn" && 12) || 0)
    )
    .force(
      "x",
      d3.forceX(d => {
        let seg = connectedRing.find(c => c.data.index === d.index);
        seg && console.log(eyeBallsRing.centroid(seg));
        return (seg && eyeBallsRing.centroid(seg)[0]) || 0;
        //return 0;
      })
    )
    .force(
      "y",
      d3.forceY(d => {
        let seg = connectedRing.find(c => c.data.index === d.index);
        seg && console.log(eyeBallsRing.centroid(seg));
        return (seg && eyeBallsRing.centroid(seg)[1]) || 0;
      })
    )
    .nodes(nodes)
    .on("tick", ticked);
});
