const config = {
  locateFile: file => `https://sql.js.org/dist/${file}`
}

function checkOnlyAddHerb() {
  const el = document.getElementById('only-add-herb');
  return el.checked;
}

let totalResult = {
  minLeftOver: 9999999999,
  minOverAdded: 9999999999,
  minPrescConst: [],
  minTotalSum: []
};

function recursiveDepth(leftDepth, leftList, prescConst, originalConst, dupTolerance) {
  
  if(leftDepth<=0) {
    let leftOver = originalConst;
    let totalSum = []
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
    for(let i=0;i<leftList.length - 1;i++) {
      let totalSum = [];
      for(let j=0;j<prescConst.length;j++) {
        totalSum = [...totalSum, ...prescConst[j]['herbConst']];
      }
      totalSum = [...new Set(totalSum)];
      const newTotalSum = [...new Set([...totalSum, ...leftList[i]['herbConst']])];
      
      const newCount = newTotalSum.length - totalSum.length;
      const dupCount = leftList[i]['herbConst'].length - newCount;
      // console.log('check', totalSum, newTotalSum, dupCount);
      if(dupTolerance < dupCount) {
        continue;
      }
      
      const newPrescConst = [...prescConst, leftList[i]];
      
      const result = recursiveDepth(leftDepth - 1, leftList.slice(i + 1), newPrescConst, originalConst, dupTolerance);
      if(checkOnlyAddHerb()) {
        if((result.leftOver < totalResult.minLeftOver) && (result.overAdded == 0)) {
          totalResult.minLeftOver = result.leftOver;
          totalResult.minOverAdded = result.overAdded;
          totalResult.minPrescConst = [result.prescConst];
          totalResult.minTotalSum = result.totalSum;
        } else if ((result.leftOver == totalResult.minLeftOver) && (result.overAdded == 0)) {
          totalResult.minPrescConst.push(result.prescConst);
        }
      } else {
        if((result.leftOver + result.overAdded) < (totalResult.minLeftOver + totalResult.minOverAdded)) {
          totalResult.minLeftOver = result.leftOver;
          totalResult.minOverAdded = result.overAdded;
          totalResult.minPrescConst = [result.prescConst];
          totalResult.minTotalSum = result.totalSum;
        } else if ((result.leftOver + result.overAdded) == (totalResult.minLeftOver + totalResult.minOverAdded)) {
          totalResult.minPrescConst.push(result.prescConst);
        }
      }
    }
    return {prescConst: totalResult.minPrescConst, leftOver: totalResult.minLeftOver, totalSum: totalResult.minTotalSum, overAdded: totalResult.minOverAdded};
  } else {
    let minLeftOver = 9999999999;
    let minOverAdded = 9999999999;
    let minPrescConst = [];
    let minTotalSum = [];
    for(let i=0;i<leftList.length - 1;i++) {
      let totalSum = [];
      for(let j=0;j<prescConst.length;j++) {
        totalSum = [...totalSum, ...prescConst[j]['herbConst']];
      }
      totalSum = [...new Set(totalSum)];
      const newTotalSum = [...new Set([...totalSum, ...leftList[i]['herbConst']])];
      
      const newCount = newTotalSum.length - totalSum.length;
      const dupCount = leftList[i]['herbConst'].length - newCount;
      // console.log('check', totalSum, newTotalSum, dupCount);
      if(dupTolerance < dupCount) {
        continue;
      }
      
      const newPrescConst = [...prescConst, leftList[i]];
      
      const result = recursiveDepth(leftDepth - 1, leftList.slice(i + 1), newPrescConst, originalConst, dupTolerance);
      if(checkOnlyAddHerb()) {
        if((result.leftOver < minLeftOver) && (result.overAdded == 0)) {
          minLeftOver = result.leftOver;
          minOverAdded = result.overAdded;
          minPrescConst = result.prescConst;
          minTotalSum = result.totalSum;
        }
      } else {
        if((result.leftOver + result.overAdded) < (minLeftOver + minOverAdded)) {
          minLeftOver = result.leftOver;
          minOverAdded = result.overAdded;
          minPrescConst = result.prescConst;
          minTotalSum = result.totalSum;
        }
      }
    }
    return {prescConst: minPrescConst, leftOver: minLeftOver, totalSum: minTotalSum, overAdded: minOverAdded};
  }
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
    const dataPromise = fetch("/static/data_fixed.sqlite").then(res => res.arrayBuffer()).then((data)=>{
      const db = new SQL.Database(new Uint8Array(data));
      setDB(db);
    });
  });
  }
  
  if((Object.keys(herbs).length == 0) && db) {
    const stmt = db.prepare("SELECT DISTINCT 약재한자명, 약재한글명 FROM prescp WHERE ((약재한자명 LIKE '%(%') = FALSE) AND 약재한자명 != '' AND 약재타입 != 'F';");
    let _herbs = {};
    while(stmt.step()) {
      const row = stmt.getAsObject();
      _herbs[row['약재한자명'].replace(/\((.*)\)/g, '')] = row['약재한글명'].replace(/\((.*)\)/g, '');
    }
    console.log(herbs);
    setHerbs(_herbs);
  }
  
  if((Object.keys(prescriptions).length == 0) && db) {
    const stmt = db.prepare("SELECT DISTINCT 처방한자명, 처방한글명, 출전, 출처, 페이지 FROM prescp WHERE 처방한자명 != '';");
    let _prescriptions = {};
    while(stmt.step()) {
      const row = stmt.getAsObject();
      _prescriptions[row['처방한자명'].replace(/\((.*)\)/g, '') + ((row['출전']) ? ('[' +  row['출전'] + ']') : '') + ' / ' + row['처방한글명'].replace(/\((.*)\)/g, '') + ' / ' + row['출처'] + ' / ' + row['페이지'].toString() + 'p'] = row['처방한자명'].replace(/\((.*)\)/g, '') + '/' + row['처방한글명'].replace(/\((.*)\)/g, '') + '/' + row['출처'] + '/' + row['페이지'].toString();
    }
    console.log(_prescriptions);
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
              const prescpHangul = prescp.split('/')[1];
              const prescpFrom = prescp.split('/')[2];
              const prescpPage = parseInt(prescp.split('/')[3]);
              
              const stmt = db.prepare(`SELECT DISTINCT 약재한자명 FROM prescp WHERE 처방한자명 = '${prescpHanja}' AND 처방한글명='${prescpHangul}' AND 출처='${prescpFrom}' AND 페이지='${prescpPage}' AND 약재한자명 != '' AND 약재한자명 IS NOT NULL AND 약재타입 != 'F';`);
              
              let _herbs = [];
              while(stmt.step()) {
                const row = stmt.getAsObject();
                _herbs.push(row['약재한자명'].replace(/\((.*)\)/g, ''))
              }
              
              let newHerbs = [...new Set([..._herbs, ...selectedHerbs])];
              console.log(_herbs, selectedHerbs, newHerbs);
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
                  return <option value={item}>{item + '(' + herbs[item] + ')'}</option>
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
              return <option value={item}>{item + '(' + herbs[item] + ')'}</option>
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
        <label id="only-add-herb-label" htmlFor={"only-add-herb"}><input type="checkbox" id="only-add-herb" defaultChecked={true} onChange={(e)=>{}}/>減味 배제(加味만 고려)</label>
      
        <label id="convert-herb-part-label" htmlFor={"convert-herb-part"}><input type="checkbox" id="convert-herb-part" />동일 약재 시 포제 구분 (체크 안 함 권장)</label>
        <label id="least-match-herb-number-label" htmlFor={"least-match-herb-number"}>기본방 최소 일치 본초 수 :&nbsp;<input type="number" id="least-match-herb-number" defaultValue="3" min="1" /></label>
        <label id="max-basic-herb-number-label" htmlFor={"max-basic-herb-number"}>기본방 최대 본초 수 :&nbsp;<input type="number" id="max-basic-herb-number" defaultValue="10" min="1" /></label>
        <label id="max-basic-prescription-number-label" htmlFor={"max-basic-prescription-number"}>최대 기본방 갯수 :&nbsp;<input type="number" id="max-basic-prescription-number" defaultValue="2" min="1" /></label>
        
        <label id="duplicate-tolerance-number-label" htmlFor={"duplicate-tolerance-number"}>기본방 간 중복 허용 갯수 :&nbsp;<input type="number" id="duplicate-tolerance-number" defaultValue="1" min="0" /></label>
        
        <button className="form-control btn inline-block btn-primary" onClick={(e) => {
          // Process #1
          let processedHerbs = [];
          if(!document.getElementById("convert-herb-part").checked) {
            const stmt = db.prepare(`SELECT DISTINCT 약재한자명, 약재한글명, 수치전약재명 FROM prescp WHERE (약재한자명 IN ("${selectedHerbs.join('", "')}")) AND 약재한자명 != '' AND (수치전약재명 IS NOT NULL) AND (LENGTH(수치전약재명) != 0);`);
            let _herbs = {};
            while(stmt.step()) {
              const row = stmt.getAsObject();
              _herbs[row['약재한자명'].replace(/\((.*)\)/g, '')] = row['수치전약재명'];
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
          
          // Process #2
          let stmt;
          
          let leastMatchHerbNumber = document.getElementById('least-match-herb-number').value;
          let maxBasicHerbNumber = document.getElementById('max-basic-herb-number').value;
          let maxBasicPrescNumber = document.getElementById('max-basic-prescription-number').value;
          let duplicateToleranceNumber = document.getElementById('duplicate-tolerance-number').value;
          
          if(!document.getElementById("convert-herb-part").checked) {
            stmt = db.prepare(`SELECT DISTINCT q3.처방한자명 as 처방한자명, q3.처방한글명 as 처방한글명, q3.herbCount as herbCount, q3.herbConst as herbConst, q3.basicCount as basicCount FROM (SELECT * FROM (SELECT 처방한자명, 처방한글명, 출처, 페이지, COUNT(*) as herbCount FROM prescp WHERE ((약재한자명 IN ("${processedHerbs.join('", "')}")) OR (수치전약재명 IN ("${processedHerbs.join('", "')}"))) AND 약재한자명 != '' GROUP BY 처방한자명, 처방한글명, 출처, 페이지) as q1 LEFT OUTER JOIN (SELECT 처방한자명, 처방한글명, 출처, 페이지, COUNT(*) as basicCount, group_concat(CASE WHEN LENGTH(TRIM(수치전약재명))=0 THEN 약재한자명 ELSE 수치전약재명 END) as herbConst FROM prescp WHERE 약재한자명 != '' GROUP BY 처방한자명, 처방한글명, 출처, 페이지) as q2 ON q1.처방한자명=q2.처방한자명 AND q1.처방한글명=q2.처방한글명 AND q1.출처=q2.출처 AND q1.페이지=q2.페이지 WHERE q1.herbCount >= ${leastMatchHerbNumber} AND q2.basicCount <= ${maxBasicHerbNumber}) as q3 GROUP BY q3.herbConst ORDER BY q3.herbCount DESC;`);
          } else {
            stmt = db.prepare(`SELECT DISTINCT q3.처방한자명 as 처방한자명, q3.처방한글명 as 처방한글명, q3.herbCount as herbCount, q3.herbConst as herbConst, q3.basicCount as basicCount FROM (SELECT * FROM (SELECT 처방한자명, 처방한글명, 출처, 페이지, COUNT(*) as herbCount FROM prescp WHERE ((약재한자명 IN ("${processedHerbs.join('", "')}"))) AND 약재한자명 != '' GROUP BY 처방한자명, 처방한글명, 출처, 페이지) as q1 LEFT OUTER JOIN (SELECT 처방한자명, 처방한글명, 출처, 페이지, COUNT(*) as basicCount, group_concat(약재한자명) as herbConst FROM prescp WHERE 약재한자명 != '' GROUP BY 처방한자명, 처방한글명, 출처, 페이지) as q2 ON q1.처방한자명=q2.처방한자명 AND q1.처방한글명=q2.처방한글명 AND q1.출처=q2.출처 AND q1.페이지=q2.페이지 WHERE q1.herbCount >= ${leastMatchHerbNumber} AND q2.basicCount <= ${maxBasicHerbNumber}) as q3 GROUP BY q3.herbConst ORDER BY q3.herbCount DESC;`);
          }
          let _prescp = [];
          while(stmt.step()) {
            const row = stmt.getAsObject();
            if(row['herbCount'] == processedHerbs.length) continue;
            if(row['herbCount'] / row['basicCount'] <= 0.5) continue;
            row['herbConst'] = row['herbConst'].split(',');
            _prescp.push(row);
          }
          console.log(_prescp);
          
          let minLeftOver = 9999999999;
          let minOverAdded = 9999999999;
          let minPrescConst = [];
          let minTotalSum = [];
          let computated = {};
          let wellTarget = null;

          for(let i=1;i<=maxBasicPrescNumber;i++) {
            totalResult = {
              minLeftOver: 9999999999,
              minOverAdded: 9999999999,
              minPrescConst: [],
              minTotalSum: []
            };
            const result = recursiveDepth(i, _prescp, [], processedHerbs, duplicateToleranceNumber);
            computated[i.toString()] = [];
            if((!result.prescConst) || (result.prescConst.length == 0)) {
              continue;
            }
            console.log(i, result);
            /*
            if(checkOnlyAddHerb()) {
              if((result.leftOver < minLeftOver) && (result.overAdded == 0)) {
                minLeftOver = result.leftOver;
                minOverAdded = result.overAdded;
                minPrescConst = result.prescConst;
                minTotalSum = result.totalSum;
                wellTarget = i.toString();
              }
            } else {
              if((result.leftOver + result.overAdded) < (minLeftOver + minOverAdded)) {
                minLeftOver = result.leftOver;
                minOverAdded = result.overAdded;
                minPrescConst = result.prescConst;
                minTotalSum = result.totalSum;
                wellTarget = i.toString();
              }
            }
            */
            /*if((result.leftOver + result.overAdded) < (minLeftOver + minOverAdded)) {
              minLeftOver = result.leftOver;
              minOverAdded = result.overAdded;
              minPrescConst = result.prescConst;
              minTotalSum = result.totalSum;
              wellTarget = i.toString();
            }*/
            for(let j=0;j<totalResult.minPrescConst.length;j++) {
              
              let result = {
                prescConst: totalResult.minPrescConst[j]
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
          
          setResultObj(computated);
          // setBestResult(wellTarget);
          
          console.log(computated);

        }}>가감 조합 검색</button>
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
                  if(resultObj[item.toString()].length == 0) {
                    return <li>기본방 {item.toString()}개 기반 해당 조건 하 검색된 가감 없음</li>
                  }
                  return (
                    <li>
                      <ul>
                        {resultObj[item.toString()].map((item) => {
                          const presc = item.prescConst.map((item) => item['처방한자명']);
                          const prescInside = item.prescConst.map((item) => item['herbConst']);
                          let resultString = `${presc[0]}(${prescInside[0].join(', ')})`;
                          
                          for(let n=1;n<presc.length;n++) {
                            resultString = resultString + ' 合 ' + presc[n] + '(' + prescInside[n].join(', ') + ')';
                          }
                          return <li><b>{resultString}</b><span className="add-remove-count">&nbsp;中 加味 {item.leftOver.length.toString()}&nbsp;減味 {item.overAdded.length.toString()}</span>
                            <ul>
                            {(item.leftOver.length != 0) && <li>加 {item.leftOver.join(', ')}</li>}
                              {(item.overAdded.length != 0) && <li>減 {item.overAdded.join(', ')}</li>}
                            </ul>
                          </li>
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