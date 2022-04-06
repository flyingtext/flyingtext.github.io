const config = {
  locateFile: file => `https://sql.js.org/dist/${file}`
}

function checkOnlyAddHerb() {
  const el = document.getElementById('only-add-herb');
  return el.checked;
}

const COUNT_OFFSET = 100000;

/*let totalResult = {
  minLeftOver: 9999999999,
  minOverAdded: 9999999999,
  minPrescConst: {},
  minTotalSum: []
};*/
let progressCount = 0;
let totalCount = 0;
let lastCount = 0;
let $searchProgressBar = $('#search-progress-bar');
let globalResultObj = null;
let globalProcessedHerbs = [];
let globalConversion = {};

document.getElementsByClassName('result-visualization-chart-modal-body')[0].addEventListener('mousemove', (e) => {
  let hoverTooltip = document.getElementsByClassName('result-visualization-chart-tooltip')[0];
  if(e.layerX != 0 && e.layerY != 0) {
    hoverTooltip.style.left = (e.clientX - 50) + 'px';
    hoverTooltip.style.top = (e.clientY - 50) + 'px';
  }
});

function visualizationDraw() {
  /*const data = [
    { name: 'S1', elems: [0,1,2] },
    { name: 'S2', elems: [1,2,3] },
    { name: 'S3', elems: [0,2,4] },
  ];*/
  const depths = Object.keys(globalResultObj);
  let data = [
    { name: '전체 처방', elems: globalProcessedHerbs }
  ];
  console.log(globalResultObj);
  let key = [];
  depths.map((depth) => {
    globalResultObj[depth].map(resultObj => {
      resultObj.prescConst.map((item, i) => {
        if(key.includes(item['처방명'] + '/' + item.herbConst.join('/'))) return;
        key.push(item['처방명'] + '/' + item.herbConst.join('/'));
        data.push({name : item['처방명'], elems: item.herbConst});
      });
    });
  });
  console.log(data);
  const sets = UpSetJS.asSets(data);

  let selection = null;
  

  function onHover(set) {
    selection = set;
    console.log(selection);
    let hoverTooltip = document.getElementsByClassName('result-visualization-chart-tooltip')[0];

    if(!selection) {
      hoverTooltip.innerHTML = `<div style="text-align:left;">
      <div><b>(없음)</b></div>
      <div>구성 : (없음)</div>
      </div>`;
    } else {
      hoverTooltip.innerHTML = `<div style="text-align:left;">
      <div><b>${set.name}</b></div>
      <div>구성 : ${(set.elems.length != 0 ) ? set.elems.join(', ') : '(해당 없음)'}</div>
      </div>`;
    }
    rerender();
  }
  function rerender() {
    const props = { sets: sets,
      width: window.innerWidth * 0.77,
      height: window.innerHeight * 0.8,
      onHover, selection };
    UpSetJS.renderVennDiagram(document.getElementById('result-visualization-chart'), props);
  }
  
  rerender();
}


function countRecursiveDepth(leftDepth, leftListLength) {
  if(leftDepth > 1) {
    let sum = 0;
    for(let i=1;i<=leftListLength;i++) {
      sum += countRecursiveDepth(leftDepth-1, leftListLength-i);
    }
    return sum;
  } else {
    return leftListLength;
  }
}


async function recursiveDepth(totalResult, leftDepth, leftList, prescConst, originalConst, dupTolerance) {
  
  if(leftDepth<=0) {
    let leftOver = originalConst;
    let totalSum = []
    // console.log(leftOver);
    for(let i=0;i<prescConst.length;i++) {
      leftOver = leftOver.filter(n => !(prescConst[i]['herbConst'].includes(n)));
      totalSum = [...totalSum, ...prescConst[i]['herbConst']];
    }
    totalSum = [...new Set(totalSum)];
    let overAdded = totalSum.filter(n => !(originalConst.includes(n))).length;
    leftOver = leftOver.length;
    
    return {prescConst, leftOver, totalSum, overAdded};
  } else if(leftDepth == 1) {
    /* let minLeftOver = 9999999999;
    let minOverAdded = 9999999999;
    let minPrescConst = [];
    let minTotalSum = [];*/
    for(let i=0;i<leftList.length;i++) {
      progressCount += 1;
      if(progressCount - lastCount > COUNT_OFFSET) {
        $searchProgressBar.attr('aria-valuenow', progressCount);
        $searchProgressBar.text(progressCount.toString() + ' / ' + totalCount.toString());
        $searchProgressBar.css('width', (Math.round(progressCount / totalCount * 10000) / 100).toString() + '%');
        lastCount = progressCount;
        await sleep(0);
      }
      let totalSum = [];
      for(let j=0;j<prescConst.length;j++) {
        totalSum = [...totalSum, ...prescConst[j]['herbConst']];
      }
      totalSum = [...new Set(totalSum)];
      const newTotalSum = [...new Set([...totalSum, ...leftList[i]['herbConst']])];
      
      const newCount = newTotalSum.length - totalSum.length;
      const dupCount = leftList[i]['herbConst'].length - newCount;
      
      if(dupTolerance < dupCount) {
        continue;
      }
      
      
      const newPrescConst = [...prescConst, leftList[i]];
      
      const result = await recursiveDepth(totalResult, leftDepth - 1, leftList.slice(i + 1), newPrescConst, originalConst, dupTolerance);
      const additionToOptimizationNumber = document.getElementById('addition-to-optimization-number').value;
      
      if(checkOnlyAddHerb()) {
        if((result.leftOver < totalResult.minLeftOver) && (result.overAdded == 0)) {
          
          for(let j=0;j<=originalConst.length;j++) {
            if(j == result.leftOver) {
              // add
              totalResult.minPrescConst[j.toString()].push(result.prescConst);
            } else if (j - result.leftOver > additionToOptimizationNumber) {
              // remove
              totalResult.minPrescConst[j.toString()] = [];
            }
          }
          
          totalResult.minLeftOver = result.leftOver;
          totalResult.minOverAdded = result.overAdded;
          // totalResult.minPrescConst = [result.prescConst];
          totalResult.minTotalSum = result.totalSum;
        } else if ((result.leftOver != 9999999999) && ((result.leftOver - totalResult.minLeftOver) <= additionToOptimizationNumber) && (result.overAdded == 0)) {
          // totalResult.minPrescConst.push(result.prescConst);
          totalResult.minPrescConst[result.leftOver.toString()].push(result.prescConst);
        }
      } else {
        if((result.leftOver + result.overAdded) < (totalResult.minLeftOver + totalResult.minOverAdded)) {
          
          for(let j=0;j<=originalConst.length;j++) {
            if(j == (result.leftOver + result.overAdded)) {
              // add
              totalResult.minPrescConst[j.toString()].push(result.prescConst);
            } else if (j - (result.leftOver + result.overAdded) > additionToOptimizationNumber) {
              // remove
              totalResult.minPrescConst[j.toString()] = [];
            }
          }
          
          totalResult.minLeftOver = result.leftOver;
          totalResult.minOverAdded = result.overAdded;
          // totalResult.minPrescConst = [result.prescConst];
          totalResult.minTotalSum = result.totalSum;
        } else if ((result.leftOver != 9999999999) && ((result.leftOver + result.overAdded) - (totalResult.minLeftOver + totalResult.minOverAdded)) <= additionToOptimizationNumber) {
          // totalResult.minPrescConst.push(result.prescConst);
          totalResult.minPrescConst[(result.leftOver + result.overAdded).toString()].push(result.prescConst);
        }
      }
    }
    return {totalResult, prescConst: totalResult.minPrescConst, leftOver: totalResult.minLeftOver, totalSum: totalResult.minTotalSum, overAdded: totalResult.minOverAdded};
  } else {
    let minLeftOver = 9999999999;
    let minOverAdded = 9999999999;
    let minPrescConst = [];
    let minTotalSum = [];
    for(let i=0;i<leftList.length;i++) {
      let totalSum = [];
      for(let j=0;j<prescConst.length;j++) {
        totalSum = [...totalSum, ...prescConst[j]['herbConst']];
      }
      totalSum = [...new Set(totalSum)];
      const newTotalSum = [...new Set([...totalSum, ...leftList[i]['herbConst']])];
      
      const newCount = newTotalSum.length - totalSum.length;
      const dupCount = leftList[i]['herbConst'].length - newCount;
      
      if(dupTolerance < dupCount) {

        let tempAddCount = countRecursiveDepth(leftDepth - 1, leftList.length - i - 1);
        
        progressCount += tempAddCount;
        if(progressCount - lastCount > COUNT_OFFSET) {
          $searchProgressBar.attr('aria-valuenow', progressCount);
          $searchProgressBar.text(progressCount.toString() + ' / ' + totalCount.toString());
          $searchProgressBar.css('width', (Math.round(progressCount / totalCount * 10000) / 100).toString() + '%');
          lastCount = progressCount;
          await sleep(0);
        }
        continue;
      }
      
      const newPrescConst = [...prescConst, leftList[i]];
      
      const result = await recursiveDepth(totalResult, leftDepth - 1, leftList.slice(i + 1), newPrescConst, originalConst, dupTolerance);
      if(checkOnlyAddHerb()) {
        if((result.leftOver != 9999999999) && (result.leftOver < minLeftOver) && (result.overAdded == 0)) {
          minLeftOver = result.leftOver;
          minOverAdded = result.overAdded;
          minPrescConst = result.prescConst;
          minTotalSum = result.totalSum;
        }
      } else {
        if((result.leftOver != 9999999999) && (result.leftOver + result.overAdded) < (minLeftOver + minOverAdded)) {
          minLeftOver = result.leftOver;
          minOverAdded = result.overAdded;
          minPrescConst = result.prescConst;
          minTotalSum = result.totalSum;
        }
      }
    }
    return {totalResult, prescConst: minPrescConst, leftOver: minLeftOver, totalSum: minTotalSum, overAdded: minOverAdded};
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function app() {
  const [db, setDB] = React.useState(null);
  const [herbs, setHerbs] = React.useState({});
  const [filterHerbs, setFilterHerbs] = React.useState('');
  const [prescriptions, setPrescriptions] = React.useState({});
  const [filterPrescp, setFilterPrescp] = React.useState('');
  const [selectedHerbs, setSelectedHerbs] = React.useState([]);
  const [targetHerbText, setTargetHerbText] = React.useState('');
  const [resultObj, setResultObj] = React.useState({});
  const [bestResult, setBestResult] = React.useState(null);
  
  if(!db) {
    initSqlJs(config).then(function(SQL){
    const dataPromise = fetch("./static/data_new_without_prescription_method.sqlite").then(res => res.arrayBuffer()).then((data)=>{
      const db = new SQL.Database(new Uint8Array(data));
      setDB(db);
    });
  });
  }
  
  if((Object.keys(herbs).length == 0) && db) {
    let stmt = db.prepare(`SELECT DISTINCT hanja, korean FROM herb_convert;`);
    let conversion = {};
    while(stmt.step()) {
      const row = stmt.getAsObject();
      conversion[row['hanja']] = row['korean'];
    }
    
    globalConversion = conversion;
    console.log(globalConversion);

    stmt = db.prepare("SELECT DISTINCT 약재명 FROM prescription_structure WHERE ((약재명 LIKE '%(%') = FALSE) AND 약재명 != '';");
    
    let _herbs = {};
    while(stmt.step()) {
      const row = stmt.getAsObject();
      if(globalConversion[row['약재명'].replace(/\((.*)\)/g, '')]) {
        _herbs[row['약재명'].replace(/\((.*)\)/g, '')] = row['약재명'].replace(/\((.*)\)/g, '');
      }
    }
    setHerbs(_herbs);
  }
  
  if((Object.keys(prescriptions).length == 0) && db) {
    const stmt = db.prepare("SELECT DISTINCT 처방명, 출전출처 FROM prescription_structure WHERE 처방명 != '';");
    let _prescriptions = {};
    while(stmt.step()) {
      const row = stmt.getAsObject();
      _prescriptions[row['처방명'] + ((row['출전출처']) ? ('[' +  row['출전출처'] + ']') : '')] = row['처방명'] + '/' + row['출전출처'];
    }
    
    setPrescriptions(_prescriptions);
  }
  
  
  return <div id="content">
  
    <div id="herb-select-board">
      <div id="add-list">
        <div className="card" id="prescription-list">
          <div className="card-body">
            <div className="inline-block">
              <h6>처방으로 본초 추가</h6>
              <input id="prescription-list-search" type="text" onChange={(e) => {
                setFilterPrescp(e.target.value);
              }}></input><br />
              <select id="prescription-list-select" name="prescription-list-select" size={15}>  
              {
                Object.keys(prescriptions).filter((item) => (item.indexOf(filterPrescp) != -1) || (prescriptions[item].indexOf(filterPrescp) != -1)).map((item, i) => {
                  return <option value={prescriptions[item]}>{item}</option>
                })
              }
              </select>
            </div>
            <button className="form-control btn inline-block btn-primary" onClick={(e) => {
              const sel = document.getElementById('prescription-list-select');
              const selArray = Array.from(sel.selectedOptions);
              if(selArray.length == 0) return;
              const prescp = selArray[0].value;
              const prescpHanja = prescp.split('/')[0];
              // const prescpHangul = prescp.split('/')[1];
              const prescpOriginalFrom = prescp.split('/')[1];
              // const prescpFrom = prescp.split('/')[3];
              // const prescpPage = prescp.split('/')[4];
              console.log(prescp.split('/'));
              let stmt;

              if(prescp.split('/')[4] == '(미기재)') {
                stmt = db.prepare(`SELECT DISTINCT 약재명 FROM prescription_structure WHERE 처방명 = '${prescpHanja}' AND 출전출처='${prescpOriginalFrom}' AND 약재명 != '' AND 약재명 IS NOT NULL;`);
              } else {
                stmt = db.prepare(`SELECT DISTINCT 약재명 FROM prescription_structure WHERE 처방명 = '${prescpHanja}' AND 출전출처='${prescpOriginalFrom}' AND 약재명 != '' AND 약재명 IS NOT NULL;`);
              }
              
              let _herbs = [];
              while(stmt.step()) {
                const row = stmt.getAsObject();
                _herbs.push(row['약재명']);//.replace(/\((.*)\)/g, ''))
              }
              
              let newHerbs = [...new Set([..._herbs, ...selectedHerbs])];
              
              setSelectedHerbs(newHerbs);
            }}>선택 처방 추가</button>
          </div>
        </div>
        
        <br />
        
        <div className="card" id="herb-list">
          <div className="card-body">
            <div className="inline-block">
              <h6>목록에서 본초 추가</h6>
              <input id="herb-list-search" type="text" onChange={(e) => {
                setFilterHerbs(e.target.value);
              }}></input><br />
              <select id="herb-list-select" name="herb-list-select" multiple="multiple" size={15}>  
              {
                Object.keys(herbs).filter(item => (selectedHerbs.indexOf(item) == -1)).filter((item) => (item.indexOf(filterHerbs) != -1) || (herbs[item].indexOf(filterHerbs) != -1)).map((item, i) => {
                  return <option value={item}>{item + '(' + globalConversion[item] + ')'}</option>
                })
              }
              </select>
            </div>
            <button className="form-control btn inline-block btn-primary" onClick={(e) => {
              const sel = document.getElementById('herb-list-select');
              let newSelectedHerbs = JSON.parse(JSON.stringify(selectedHerbs));
              Array.from(sel.selectedOptions).map((item) => {
                newSelectedHerbs.push(item.value);
              });
              setSelectedHerbs(newSelectedHerbs);
            }}>선택 본초 추가</button>
          </div>
        </div>
      </div>
    
    <div className="card" id="analysis-target">
      <div className="card-body">
        <div className="inline-block">
          <h6>분석 대상 목록</h6>
          <select id="analysis-target-list" name="analysis-target-list" size={35} multiple="multiple">  
          {
            selectedHerbs.map((item, i) => {
              return <option value={item}>{item}</option>
            })
          }
          </select>
        </div>
        <button className="form-control btn inline-block btn-primary" onClick={(e) => {
          const sel = document.getElementById('analysis-target-list');
          
          let toBeDeleted = [];
          Array.from(sel.selectedOptions).map((item) => {
            toBeDeleted.push(item.value);
          });
          
          let newSelectedHerbs = JSON.parse(JSON.stringify(selectedHerbs));
          setSelectedHerbs(newSelectedHerbs.filter(item => toBeDeleted.indexOf(item) == -1));
        }}>선택 본초 제외</button>
      </div>
    </div>
  </div>
  <div id="analysis-board">
    <div className="card">
      <div className="card-body">
        <button className="form-control btn inline-block btn-primary" onClick={(e)=>{
          const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('search-configuration-option-explanation-modal'));
          modal.toggle();
        }}>검색 옵션 설정 방법 설명 보기</button>

        
      
        <label id="only-add-herb-label" htmlFor={"only-add-herb"}><input type="checkbox" id="only-add-herb" defaultChecked={false} onChange={(e)=>{}}/>去味 배제(加味만 고려)</label>
        <label id="convert-herb-part-label" htmlFor={"convert-herb-part"}><input type="checkbox" id="convert-herb-part" />동일 약재 시 포제 구분 (체크 안 함 권장)</label>
        <label id="no-add-name-label" htmlFor={"no-add-name"}><input type="checkbox" id="no-add-name" defaultChecked={true} />기본방에서 이름에 "가미" 혹은 "가감"이 들어간 처방은 제외</label>
        
        <label id="least-match-herb-number-label" htmlFor={"least-match-herb-number"}>기본방 최소 일치 본초 수 :&nbsp;<input type="number" id="least-match-herb-number" defaultValue="3" min="1" /></label>
        <label id="max-basic-herb-number-label" htmlFor={"max-basic-herb-number"}>기본방 최대 본초 수 :&nbsp;<input type="number" id="max-basic-herb-number" defaultValue="15" min="1" /></label>
        <label id="max-basic-prescription-number-label" htmlFor={"max-basic-prescription-number"}>최대 기본방 갯수 :&nbsp;<input type="number" id="max-basic-prescription-number" defaultValue="2" min="1" /></label>
        <label id="duplicate-tolerance-number-label" htmlFor={"duplicate-tolerance-number"}>기본방 간 중복 허용 갯수 :&nbsp;<input type="number" id="duplicate-tolerance-number" defaultValue="1" min="0" /></label>
        
        <label id="addition-to-optimization-number-label" htmlFor={"addition-to-optimization-number"}>최적 가미 대비 추가 여유 :&nbsp;<input type="number" id="addition-to-optimization-number" defaultValue="1" min="0" /></label>
        
        
        
        <button className="form-control btn inline-block btn-primary" onClick={async (e) => {
          
          // Process #1-1
          let processedHerbs = [];
          if(!document.getElementById("convert-herb-part").checked) {
            const stmt = db.prepare(`SELECT DISTINCT 약재명, 순수약재명 FROM prescription_structure WHERE (약재명 IN ("${selectedHerbs.join('", "')}")) AND 순수약재명 != '';`);
            let _herbs = {};
            while(stmt.step()) {
              const row = stmt.getAsObject();
              console.log(row);
              _herbs[row['약재명'].replace(/\((.*)\)/g, '')] = row['순수약재명'];
            }
            for(let i=0;i<selectedHerbs.length;i++) {
              if(Object.keys(_herbs).indexOf(selectedHerbs[i]) != -1) {
                processedHerbs.push(_herbs[selectedHerbs[i]]);
              } else {
                processedHerbs.push(selectedHerbs[i]);
              }
            }
          } else {
            processedHerbs = selectedHerbs;
          }

          setTargetHerbText('- 조합 대상 선정 : ' + processedHerbs.join(', '));
          globalProcessedHerbs = processedHerbs;
          let leastMatchHerbNumber = document.getElementById('least-match-herb-number').value;
          let maxBasicHerbNumber = document.getElementById('max-basic-herb-number').value;
          let maxBasicPrescNumber = document.getElementById('max-basic-prescription-number').value;
          let duplicateToleranceNumber = document.getElementById('duplicate-tolerance-number').value;
          let noAddNameCheck = document.getElementById('no-add-name').checked;
          
          // Process #1-2
          
          let stmt;

          // Process #2
          
          
          
          if(!document.getElementById("convert-herb-part").checked) {

            stmt = db.prepare(`SELECT DISTINCT q4.처방명 as 처방명, q4.herbCount as herbCount, q4.herbConst as herbConst, q4.basicCount as basicCount, group_concat(CASE WHEN q4.출전출처="" THEN '미상' ELSE q4.출전출처 END) as 출전출처 FROM 
            
            (SELECT * FROM (SELECT * FROM (SELECT 처방명, 출전출처, COUNT(*) as herbCount FROM prescription_structure WHERE (순수약재명 IN ("${processedHerbs.join('", "')}")) AND 약재명 != '' GROUP BY 처방명, 출전출처) as q1 LEFT OUTER JOIN (SELECT 처방명, 출전출처, COUNT(*) as basicCount, group_concat(순수약재명) as herbConst FROM prescription_structure WHERE 순수약재명 != '' GROUP BY 처방명, 출전출처) as q2 ON q1.처방명=q2.처방명 AND q1.출전출처=q2.출전출처 WHERE q1.herbCount >= ${leastMatchHerbNumber} AND q2.basicCount <= ${maxBasicHerbNumber}) as q3 GROUP BY q3.herbConst, q3.출전출처) as q4
            
            GROUP BY q4.herbConst ORDER BY q4.herbCount, group_concat(CASE WHEN q4.출전출처="" THEN '미상' ELSE q4.출전출처 END) DESC;`);
          } else {

            stmt = db.prepare(`SELECT DISTINCT q4.처방명 as 처방명, q4.herbCount as herbCount, q4.herbConst as herbConst, q4.basicCount as basicCount, group_concat(CASE WHEN q4.출전출처="" THEN '미상' ELSE q4.출전출처 END) as 출전출처 FROM 
            
            (SELECT * FROM (SELECT * FROM (SELECT 처방명, 출전출처, COUNT(*) as herbCount FROM prescription_structure WHERE (약재명 IN ("${processedHerbs.join('", "')}")) AND 약재명 != '' GROUP BY 처방명, 출전출처) as q1 LEFT OUTER JOIN (SELECT 처방명, 출전출처, COUNT(*) as basicCount, group_concat(약재명) as herbConst FROM prescription_structure WHERE 약재명 != '' GROUP BY 처방명, 출전출처) as q2 ON q1.처방명=q2.처방명 AND q1.출전출처=q2.출전출처 WHERE q1.herbCount >= ${leastMatchHerbNumber} AND q2.basicCount <= ${maxBasicHerbNumber}) as q3 GROUP BY q3.herbConst, q3.출전출처) as q4
            
            GROUP BY q4.herbConst ORDER BY q4.herbCount, group_concat(CASE WHEN q4.출전출처="" THEN '미상' ELSE q4.출전출처 END) DESC;`);
          }
          let _prescp = [];
          while(stmt.step()) {
            const row = stmt.getAsObject();
            if(noAddNameCheck) {
              if(row['처방명'].indexOf('加味') != -1) continue;
              if(row['처방명'].indexOf('加減') != -1) continue;
            }
            if(row['herbCount'] == processedHerbs.length) continue;
            if(row['herbCount'] / row['basicCount'] <= 0.5) continue;

            row['herbConst'] = row['herbConst'].split(',');
            _prescp.push(row);
          }
          console.log(_prescp);
          
          // Progressbar setting
          const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('search-progress-modal'), {backdrop: 'static', keyboard:false});
          modal.toggle();
          
          progressCount = 0;
          totalCount = 0;
          lastCount = 0;
          let gopArray = [];
          for(let i=1;i<=maxBasicPrescNumber;i++) {
            let tempTotal = countRecursiveDepth(i, _prescp.length);

            totalCount += tempTotal;
          }
          
          $searchProgressBar.attr('aria-valuemax', totalCount);
          $searchProgressBar.text('0 / ' + totalCount.toString());
          await sleep(0);
          
          let minPrescConst = {};
          let computated = {};
          let wellTarget = null;
          
          for(let i=0;i<=processedHerbs.length * 2;i++) {
            minPrescConst[i.toString()] = [];
          }

          for(let i=1;i<=maxBasicPrescNumber;i++) {
            let totalResult = {
              minLeftOver: 9999999999,
              minOverAdded: 9999999999,
              minPrescConst: JSON.parse(JSON.stringify(minPrescConst)),
              minTotalSum: []
            };
            const result = await recursiveDepth(totalResult, i, _prescp, [], processedHerbs, duplicateToleranceNumber);
            
            computated[i.toString()] = [];
            if((!result.prescConst) || (result.prescConst.length == 0)) {
              continue;
            }
            // console.log(i, totalResult);
            totalResult = result.totalResult;
            for(let j=0;j<Object.keys(totalResult.minPrescConst).length;j++) {
              for(let k=0;k<totalResult.minPrescConst[j.toString()].length;k++) {
                let result = {
                  prescConst: totalResult.minPrescConst[j.toString()][k]
                };
                
                let leftOver = JSON.parse(JSON.stringify(processedHerbs));
                let totalSum = []
                for(let k=0;k<result.prescConst.length;k++) {
                  leftOver = leftOver.filter(n => !(result.prescConst[k]['herbConst'].includes(n)));
                  totalSum = [...totalSum, ...result.prescConst[k]['herbConst']];
                }
                totalSum = [...new Set(totalSum)];
                let overAdded = totalSum.filter(n => !(processedHerbs.includes(n)));
                
                result.overAdded = overAdded;
                result.leftOver = leftOver;
                computated[i.toString()].push(result);
              }
              
              
            }
            
          }
          console.log(computated);
          modal.toggle();
          setResultObj(computated);
          // setBestResult(wellTarget);
          
          

        }}>가감 조합 검색</button>
        <br></br>
        <br></br>        
        <button className="form-control btn inline-block btn-primary" onClick={(e)=>{
          globalResultObj = resultObj;
          visualizationDraw();
          console.log(globalResultObj);
          const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('result-visualization-modal'));
          modal.toggle();
        }}>검색 결과 시각화</button>
        <div>
        <br/>
          <div><b>1. 조합 검색 대상 본초 선정</b></div>
          <div>
          {targetHerbText}
          </div><br/>
          <div><b>2. 조합 목록</b></div>
          <div>
            <ol>
              {
                (Object.keys(resultObj).length != 0) && Array.from({length: document.getElementById('max-basic-prescription-number').value}, (_, i) => i + 1).map((item) => {
                  if(resultObj[item.toString()] && resultObj[item.toString()].length == 0) {
                    return <li>기본방 {item.toString()}개 기반 해당 조건 하 검색된 가감 없음</li>
                  }
                  return (
                    <li>
                      <ul>
                        {resultObj[item.toString()] && resultObj[item.toString()].map((item) => {
                          const presc = item.prescConst.map((item) => item['처방명']);
                          const prescFrom = item.prescConst.map((item) => item['출전출처'].toString());
                          // const prescFromBook = item.prescConst.map((item) => item['출처'].toString());
                          // const prescPage = item.prescConst.map((item) => item['페이지'].toString());
                          
                          const prescInside = item.prescConst.map((item) => item['herbConst']);
                          return <li>
                            
                                {presc.map((prescItem, j) => {
                                  if(j != (presc.length - 1)) {
                                    
                                    return <span>
                                      <span className="presc-name">{prescItem}</span>
                                      <span className="presc-from" onClick={(e) => {
                                        console.log(e.target);
                                        if(e.target.style.maxWidth == '' || e.target.style.maxWidth == '100px') {
                                          e.target.style.maxWidth='100%';
                                          e.target.style.whiteSpace='normal';
                                        } else {
                                          e.target.style.maxWidth='100px';
                                          e.target.style.whiteSpace='nowrap';
                                        }
                                      }}>[{prescFrom[j]}]</span>
                                      <span className="presc-inside">
                                      ({prescInside[j].join(', ')})
                                      </span>
                                      <span> 合 </span>
                                    </span>
                                  } else {
                                    
                                    return <span>
                                      <span className="presc-name">{prescItem}</span>
                                      <span className="presc-from" onClick={(e) => {
                                        console.log(e.target);
                                        if(e.target.style.maxWidth == '' || e.target.style.maxWidth == '100px') {
                                          e.target.style.maxWidth='100%';
                                          e.target.style.whiteSpace='normal';
                                        } else {
                                          e.target.style.maxWidth='100px';
                                          e.target.style.whiteSpace='nowrap';
                                        }
                                      }}>[{prescFrom[j]}]</span>
                                      <span className="presc-inside">
                                      ({prescInside[j].join(', ')})
                                      </span>
                                    </span>
                                  }
                                })}
                                  <span className="add-remove-count">&nbsp;中 加味 {item.leftOver.length.toString()}&nbsp;去味 {item.overAdded.length.toString()}</span>

                                    <ul>
                                    {(item.leftOver.length != 0) && <li>加 <span className="add-herb">{item.leftOver.join(', ')}</span></li>}
                                      {(item.overAdded.length != 0) && <li>去 <span className="remove-herb">{item.overAdded.join(', ')}</span></li>}
                                    </ul>

                            
                          </li>;
                          
                        })}
                      </ul>
                    </li>
                  )
                  
                  
                })
              }
            </ol>
          </div><br/>
        </div>
      </div>
    </div>
  </div>
  </div>
}

const e = React.createElement;

const domContainer = document.querySelector('#app');
ReactDOM.render(e(app), domContainer);