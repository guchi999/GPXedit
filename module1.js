// ///////////////////////// 定数設定 //////////////////////// 
	const SrUpS  = 0.5; 	//急な上りの速度比(平地を1として)
	const SrUp   = 0.8; 	//上りの速度比
	const SrDwn  = 1.15;	//下りの速度比
	const SrDwnS = 0.85; 	//急な下りの速度比
	const UpTh1  = 0.04;	//上り傾斜の閾値(4m/100m)
	const UpTh2  = 0.5;	//急な上り傾斜の閾値(50m/100m)
	const DwnTh1 = -0.04;	//下り傾斜の閾値
	const DwnTh2 = 0.5;	//急な下り傾斜の閾値

	const jumpList = [
	"丹沢/12/35.468296/139.159901",
	"奥多摩/12/35.779436/139.127785",
	"奥秩父/12/35.889328/138.701129",
	"八ヶ岳/12/35.973157/138.371695",
	"南アルプス北部/12/35.705820/138.253997",
	"南アルプス南部/12/35.486710/138.170375",
	"穂高/14/36.291827/137.657205",
	"白馬/14/36.753452/137.758470",
	"谷川岳/14/36.841189/138.930870",
	"六甲山/15/34.775094/135.262211",
	"岩手山/13/39.848780/140.994189",
	"御在所岳/15/35.019287/136.421900",
	"石狩山地/11/43.536241/142.944520",
	"久住山/13/33.099360/131.262643",
	"剣山/15/33.854081/134.095124",
	"富士山/13/35.362715/138.731133",
	];

// ///////////////////////// グローバル変数 //////////////////////// 
var mymap;
var mode = "edit";
//var mode = document.selbttn1.mode.value; // 作業モード状態
var eleTile = {}; // 標高タイル保存
// ルートプロファイル用
var RidNum = 0; // ルートID用番号
var RouteList = {}; // { routeId(ルートID)]: [ ルート名.(GpxFileName), track数, WP数 ] ... }
var Track = {}; // { routeName: [name, number, name, number, ...], ... }
var TrksegTxt = {}; // { routeId:[track1,...] }
var Header = {}; // { routeId:[ header, wpt ] ... }
var RLines = {}; // { routeName: [L.line, .... ] }
var RIcons = {}; // { routeName: [L.mark .... . }
// ルートクリック用
var ChoseRoute = {}; // 選択ルートのLineレイヤリスト
var DevideMark = {}; // 分割/情報マーカーリスト { "0":{route:routeId, track:trackId, indx:マーカ位置trkpt indexクス, mark:L.marker()}, 1:{...} }
var ChoseTrack = 0; // 選択トラックレジスタ  選択トラックの trckNumber
var EditRtTr = {}; // editの範囲 { routeId:[ trckNumber, MBindex ] }トラック、インデックス
var LmarkerList = {}; // make, edit のmarkerレイヤリスト { markNam:L.marker(), ....}
var LmarkerIndex = {}; // make, editのmarkerーのインデックス {1:[markNam, 0], 2:[markNam, 1 , ...}
var markN = 0; // トラックマーカー識別番号 markNam = "m" + markN
var MarkerLine; // make, edit のlineレイヤ
var WptMark = ""; // wptEdit 選択マーカーの LmarkerIndexのインデックス"番号"(テキスト)
var ActRoute = ""; // アクティブルートの routeId
var MergAct = ""; // 結合モードでの主アクティブルートのrouteId

// ///////////////////////// 共通関数 //////////////////////// 
const HeaderTxt = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.topografix.com/GPX/1/0" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" creator="https://github.com/guchi999">\n';
const WrtMessage1 = (str) =>{ document.getElementById("message1").innerHTML = str;}
const WrtMessage2 = (str) =>{ document.getElementById("message2").innerHTML = str;}
const Bttn1Value = () =>{ return document.selbttn2.ChoiceOP.value; } // オペレーション画面ボタン値取得１
const Bttn2Value = () =>{ return document.selbttn3.ChoiceOP.value; } // オペレーション画面ボタン値取得２
const strCount = (searchStr, str)=>{ return ( searchStr.match( new RegExp( str, "g" ) ) || [] ).length ; } // searchStr中のstrの数を求める
function  GetDoc(Did) { return document.getElementById(Did).value; }; // エレメント(Did)値取得

// 地図表示
function DrwMap(){
	mymap = L.map('mapWin1').setView([38, 137], 4 );
	L.tileLayer(
		"https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
		{attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',maxZoom: 18}
	).addTo(mymap);
 	Markicon = L.divIcon({ className: "icon1", html: "", iconSize: [4, 4], iconAnchor: [6, 6] });
 	Sicon = L.divIcon({ className: "icon2", html: "", iconSize: [8, 8], iconAnchor: [4, 4] });
 	Gicon = L.divIcon({ className: "icon3", html: "", iconSize: [8, 8], iconAnchor: [4, 4] });
	mymap.on('click', MapClick);
}

// ルート名チェック  ルート名がRouteListにあればtrue、なければfalseを返す
const chkRoteName = (routeName) =>{ 
	let nameChk = 0; for ( let key in RouteList){ if ( RouteList[ key ][0] === routeName ){ nameChk = 1; } }
	if ( nameChk != 0 ){ return true; }else{ return false; }
}

// 文字列entStrのpinterの位置から<trkptを検索しtrkptの経度、緯度、標高、時間を返す
// 引数：(検索文字列、検索位置) 返値：[pointer, Lat, Lon, ele, strTime, trkptStr] "trkpt"が見つからない時はpointerに-1
function get_trkptDat( entStr, pointer ){
	pointer = entStr.indexOf("<trkpt",pointer);
	if (pointer === -1){ return trkpArr = [pointer, , , ,"" ,""]; }
	let trkptStrEnd = entStr.indexOf("<trkpt",pointer + 1);
	if ( trkptStrEnd === -1 ){ trkptStrEnd = entStr.indexOf("</trkpt>",pointer)+9; }
	let trkptStr = entStr.substring(pointer, trkptStrEnd );
	if ( trkptStr.substring( trkptStr.lastIndexOf( "trkpt>" ) ).indexOf("<") != -1 ){ trkptStr = trkptStr.substring( 0, trkptStr.lastIndexOf( "<" ) ); }
	let Latpt = trkptStr.indexOf("lat=");
	let Lonpt = trkptStr.indexOf("lon=");
	strLat = trkptStr.substring( Latpt+5, trkptStr.indexOf('"', Latpt+5) );
	strLon = trkptStr.substring( Lonpt+5, trkptStr.indexOf('"', Lonpt+5) );
	let strEle;
	( trkptStr.indexOf("<ele>") !== -1 ) ? strEle = trkptStr.substring( trkptStr.indexOf("<ele>")+5, trkptStr.indexOf("</ele>") ): strEle = "";
	let strTime;
	( trkptStr.indexOf("<time>") !== -1 ) ? strTime = trkptStr.substring( trkptStr.indexOf("<time>")+6, trkptStr.indexOf("</time>") ): strTime = "";
	return [pointer, parseFloat(strLat), parseFloat(strLon), parseFloat(strEle), strTime, trkptStr];
}

// trksegTxt から latlon 配列作成
function make_LatlonFmTrkTxt( trksegTxt ){
	let latlon = [], Point = 0;
	while (Point != -1 ){
		let trkpDat = get_trkptDat(trksegTxt, Point);
		Point = trkpDat[0];
		if ( trkpDat[0] != -1 ){ 
			latlon.push( [ trkpDat[1], trkpDat[2] ] );
			Point++;
		}
	}
	return latlon;
}

// trksegTxt から ele 配列作成
function make_EleFmTrkTxt( trksegTxt ){
	let ele = [], Point = 0;
	while (Point != -1 ){
		let trkpDat = get_trkptDat(trksegTxt, Point);
		Point = trkpDat[0];
		if ( trkpDat[0] != -1 ){ 
			ele.push( trkpDat[3] );
			Point++;
		}
	}
	return ele;
}

// trksegTxt から time 配列作成
function make_TimeFmTrkTxt( trksegTxt ){
	let time = [], Point = 0;
	while (Point != -1 ){
		let trkpDat = get_trkptDat(trksegTxt, Point);
		Point = trkpDat[0];
		if ( trkpDat[0] != -1 ){ 
			time.push( trkpDat[4] );
			Point++;
		}
	}
	return time;
}


// routeIdをActRouoteにしてライン色を赤、それ以外は紫にする V2.2
function change_ActColor( routeId ){ 
	ActRoute = routeId;
	del_routeLine( ActRoute ); drw_routelineColo( ActRoute, "red" );
	if ( Object.keys( RouteList ).length > 1 ){
		for (let RTI of Object.keys( RouteList )){
			if ( RTI != ActRoute ){
				del_routeLine( RTI ); drw_routelineColo( RTI, "mediumorchid" );
			}
		}
	}
}

// ルートの描画 (Active/nonActive、SGicon) V2.2
function drw_routelineColo( routeId, LinColor ){
	let lineArr = [], iconArr = [], latlonAll = [];
	for ( let i = 0; i < RouteList[routeId][1]; i++ ){
		let trksegTxt = TrksegTxt[routeId][ i ];
		let latlon = [], Point = 0;
		while (Point != -1 ){ // latlon配列作成ループ
			let trkpDat = get_trkptDat(trksegTxt, Point);
			Point = trkpDat[0];
			if ( trkpDat[0] != -1 ){ 
				latlon.push( [ trkpDat[1], trkpDat[2] ] );
				Point++;
			}
		}
		let RTid = `${routeId}T${String( i+1 )}`;
		let DrawDat = draw_trackLine( RTid, latlon, LinColor ); // line, icon 描画
		lineArr.push( DrawDat[0] );
		iconArr.push( DrawDat[1], DrawDat[2] );
		latlonAll = latlonAll.concat(latlon);
	}
	RLines[routeId] = lineArr.slice();
	RIcons[routeId] = iconArr.slice();
	return latlonAll;
}

// トラックラインとSGiconの描画 RTid=RxxTyy(名前), LineLatlon=[ [lat,lon], .... ], Rcolor(色)
function draw_trackLine( RTid, LineLatlon, Rcolor ){
	let trackLine; ( Rcolor === "red" ) ? // V2.2 ActRouteの右クリック追加
		trackLine = L.polyline(LineLatlon, {title:RTid, color: Rcolor, weight: 5, bubblingMouseEvents: false }).on('click', TrackClick).on('contextmenu', ActLinClkRt).addTo(mymap):
		trackLine = L.polyline(LineLatlon, {title:RTid, color: Rcolor, weight: 5, bubblingMouseEvents: false }).on('click', TrackClick).addTo(mymap);
	let Spoint = LineLatlon[0], Gpoint = LineLatlon[ LineLatlon.length -1 ];
	let Smark = L.marker(Spoint, {title:RTid+"S", icon:Sicon }).on('click', SGmarkClick).addTo(mymap);
	let Gmark = L.marker(Gpoint, {title:RTid+"G", icon:Gicon }).on('click', SGmarkClick).addTo(mymap);
	return [ trackLine, Smark, Gmark ];
}

// ActRouteの右クリック V2.2
function ActLinClkRt(){ 
	if (mode === "wptEdit"){//  ActRoute解除【wptEdit】
		for ( let M in LmarkerList ){ mymap.removeLayer( LmarkerList[M] ); }
		LmarkerList = {}; LmarkerIndex = {};
		del_routeLine( ActRoute ); drw_routelineColo( ActRoute, "mediumorchid" );
		ActRoute = "";
		modeChange();
	}
}

// ルートラインとS/Gアイコンの消去
function del_routeLine( routeId ){
	for ( let i = 0; i < RouteList[routeId][1]; i++ ){
		mymap.removeLayer( RLines[routeId][i] );
		mymap.removeLayer(RIcons[routeId][ i * 2 ]);
		mymap.removeLayer(RIcons[routeId][ i * 2 + 1]);
	}
	delete RLines[routeId];
	delete  RIcons[routeId];
}

// 読み込みルートリスト表示
function dsp_routeList(){
	routTxt = "";
	for ( let routeId in RouteList ){ routTxt += RouteList[ routeId ][0] + "<br>"; }
	document.getElementById("message3").innerHTML = routTxt;
}

// 2つの緯度、経度から２点間の距離を求める (ヒュベニの公式）
function hubeny(ido1, keido1, ido2, keido2){ 
	let P = (ido1 + ido2) / 2 * Math.PI / 180;
	let dP = (ido1 - ido2) * Math.PI / 180;
	let dR = (keido1 - keido2) * Math.PI / 180;
	let M = 6334834 / Math.sqrt(Math.pow((1 - 0.006674 * Math.sin(P) * Math.sin(P)),3));
	let N = 6377397 / Math.sqrt(1 - 0.006674 * Math.sin(P) * Math.sin(P));
	return D = Math.sqrt((M * dP) * (M * dP) + (N * Math.cos(P) * dR) * (N * Math.cos(P) * dR));
}

// trkseg に時間データの有無をチェック  戻り  有: [ 0, 0 ]   無: [ 1, trkIndex ] 
function trksegTimeChk( routeId ){
	let errFlag = 0, errTrk = 0;
	for ( let i = 0; i < RouteList[ routeId ][1]; i++ ){
		let PT = 0, trkpt = [];
		errFlag = 0;
		while ( PT != -1 ){
			 trkpt =  get_trkptDat( TrksegTxt[routeId][ i ], PT );
			 PT = trkpt[0];
			if (  PT != -1){
				if ( trkpt[4] === "" ){
					errFlag = 1; break;
				}else{
					PT++;
				}
			 }
		}
		if ( errFlag != 0 ){ errTrk = i; }
	}
	return [ errFlag, errTrk ];
}

// trkseg に標高データの有無をチェック  戻り  有: [ 0, 0 ]   無: [ 1, trkIndex ] 
function trksegEleChk( routeId ){
	let errFlag = 0, errTrk = 0;
	for ( let i = 0; i < RouteList[ routeId ][1]; i++ ){
		let PT = 0, trkpt = [];
		errFlag = 0;
		while ( PT != -1 ){
			 trkpt =  get_trkptDat( TrksegTxt[routeId][ i ], PT );
			 PT = trkpt[0];
			if (  PT != -1){
				if ( Number.isNaN( trkpt[3] ) ){
					errFlag = 1; break;
				}else{
					PT++;
				}
			 }
		}
		if ( errFlag != 0 ){ errTrk = i; }
	}
	return [ errFlag, errTrk ];
}


// ///////////////////////// モード変更 //////////////////////// 

// モード変更時の初期化
function modeChange(){
	EditRtTr = {}; AddedMark = {}; ChoseTrack = 0; WrtMessage1("");  WrtMessage2(""); MergAct = "";
	if (Object.keys(LmarkerList).length != 0 ){
		for ( let M in LmarkerList ){ mymap.removeLayer( LmarkerList[M] ); }
		if ( ( MarkerLine ?? 0 ) != 0 ){ mymap.removeLayer(MarkerLine); } // undefinedの判定が必要
		LmarkerList = {}; LmarkerIndex = {}; 
	}
	if (Object.keys(DevideMark).length != 0 ){
		for ( let DN in DevideMark){ mymap.removeLayer(DevideMark[ DN ].mark); }
		DevideMark = {};
	}
	if (Object.keys(ChoseRoute).length != 0 ){
		for ( let key in  ChoseRoute ){
			let deleLin = ChoseRoute[ key ];
			for ( let i = 0; i < deleLin.length; i++ ){ mymap.removeLayer( deleLin[i] ); }
		}
		ChoseRoute = {};
	}
	if (OParea1.hasChildNodes()){ for (let i= OParea1.childNodes.length-1; i>=0; i--){ OParea1.removeChild(OParea1.childNodes[i]); } }
	if (OParea2.hasChildNodes()){ for (let i= OParea2.childNodes.length-1; i>=0; i--){ OParea2.removeChild(OParea2.childNodes[i]); } }
	if (OParea3.hasChildNodes()){ for (let i= OParea3.childNodes.length-1; i>=0; i--){ OParea3.removeChild(OParea3.childNodes[i]); } }
	if (OParea4.hasChildNodes()){ for (let i= OParea4.childNodes.length-1; i>=0; i--){ OParea4.removeChild(OParea4.childNodes[i]); } }
	switch (mode){
		case "make":
			addInputForm("OParea1", "route1", "ルート名：", "new_route" );
			addInputForm("OParea2", "track1", "トラック名：", "track" );
			addDateForm("OParea3", "SetTime" );
			addBttnForm("OParea4", "fix_make_route()", "作成トラックを確定してルート変換：", "確定" );
			break;
		case "divide":
			addInputForm("OParea1", "trk1", "前半ルート名：", "ルート名-1" );
			addInputForm("OParea2", "trk2", "後半ルート名：", "ルート名-2" );
			addBttnForm("OParea3", "divide_route()", "マーカー位置でルートを分割：", "確定" );
			break;
		case "remove":
			addRadioForm("OParea1", 1, "selbttn2", [ "始点からマーカーまで削除", "マーカー間を削除", "マーカー間を残す", "マーカーから終点まで削除" ]);
			addBttnForm("OParea2", "patial_remove()", "ルートの部分削除：", "確定" );
			break;
		case "merge":
			addRadioForm("OParea1", 0, "selbttn2" , [ "トラックを統合して結合", "トラックを時系列で結合" , "トラックの単純接続"]);
			addInputForm("OParea2", "trk1", "結合後のルート名：", "" );
			addRadioForm("OParea3", 0, "selbttn3" , [ "ルート1のヘッダを使用", "ルート2のヘッダを使用" ]);
			addBttnForm("OParea4", "exec_merge()", "選択ルートを結合：", "確定" );
			break;
		case "edit":
			addBttnForm("OParea1", "fix_edit()", "編集トラックを確定してルートに反映：", "確定" );
			break;
		case "decimate":
			addInputForm("OParea1", "interval", "間引き間隔(m )：", "10", "6" );
			addBttnForm("OParea2", "exec_decimate()", "ポイントを間引く：", "実行" );
			break;
		case "TmChang":
			addRadioForm("OParea1", 0, "selbttn2" , [ "時間変更", "時間シフト" ]);
		//	addRadioForm("OParea2", 0, "selbttn3" , [ "ルート全体", "指定トラックのみ" ]);
			addDateForm("OParea2", "SetTime" );
			addBttnForm("OParea3", "change_time()", "選択ルートの時間を変更：", "変更" );
			break;
		case "reverse":
			addInputForm("OParea1", "trk1", "逆ルート名：", "逆ルートの名前" );
			addBttnForm("OParea2", "make_reverseRoute()", "逆ルートに変換：", "実行" );
			break;
		case "NaChang":
			addInputForm("OParea1", "trk1", "", "ルート名" );
			addTxtBox("OParea2", "trk2" );
			document.getElementById("trk2").value = "<name>トラック名<number>番号"
			addBttnForm("OParea3", "change_RTname()", "ルート名、トラック名を変更：", "確定" );
			break;
		case "save":
			addInputForm("OParea1", "trk1", "保存するファイル名：", "" );
			addRadioForm("OParea2", 0, "selbttn2" , [ "元ファイル形式", "最小サイズ",  "元ファイル形式(wpt無)", "最小サイズ(wpt無)"]);
			addSaveLink("OParea3");
			break;
		case "Pinfo": // V2.1 標高入力の追加, 実行ルーチンの名前変更
			 addOneTimeForm("OParea1", "ChgTime" );
			 addInputForm("OParea2", "ChgEle", "ポイントの標高 (ｍ)：", "" , "8");
			 addBttnForm("OParea3", "chg_pointTimeEle()", "", "時間/標高の変更確定" );
			break;
		case "jump":
			let PlaceArr = [];
			for ( let i = 0; i < jumpList.length; i++ ){ PlaceArr.push( jumpList[ i ].split("/")[0] ); }
			addRadioForm("OParea1", -1 , "selbttn2", PlaceArr, "junp_select()" );
			break;
		case "EleRepl": // V2.1 代替標高入力の追加
			addBttnForm("OParea1", "ele_replace()", "標高データを地理院地図の標高に置き換える：", "実行" );
			addRadioForm("OParea2", 0 , "selbttn2" , [ "地理院地図で標高データが無い所は代替値を使う", "使わない"]);
			addInputForm("OParea3", "repEle", "標高代替値(m )：", "0", "8" );
			break;
		case "wptEdit":
			addInputForm("OParea1", "trk1", "名前　　：", "" );
			addInputForm("OParea2", "trk2", "コメント：", "" );
			addInputForm("OParea3", "trk3", "説明　　：", "" );
			addBttnForm("OParea4", "wpt_edit()", "ウェイポイントの各項目の変更：", "確定" );
			break;
	}
	if (ActRoute != ""){
		if (mode === "merge"){
			del_routeLine( ActRoute );
			ChoseRoute[ActRoute] = drw_routelineColo( ActRoute, "yellow" );
		}else{
			change_ActColor( ActRoute ); // V2.2
		}
		if ( mode === "wptEdit" ){
			place_wptMark( ActRoute );
		}
		dsp_routeInfo( ActRoute ); // V2.2
	}else if (Object.keys(RouteList).length != 0){
		if (mode != "make" && mode != "jump" && mode != "delete"){WrtMessage1( `<b>(編集ルートをクリックして選択)</b>` );}
	}
	dsp_routeList();
}

// 実行ボタン生成
function addBttnForm( location, funcN, txt1, txt2){
	let place = document.getElementById( location );
	let SPN = document.createElement("span");
	let InpName = document.createTextNode( txt1 );
	SPN.appendChild(InpName);
	place.appendChild( SPN );
	let compo = document.createElement("input");
	compo.setAttribute("type","button");
	compo.setAttribute("onclick",funcN); 
	compo.setAttribute("size","10"); 
	compo.setAttribute("value",txt2);
	place.appendChild( compo );
}

// インプットボックス(txt)生成
function addInputForm( location, idNam, txt1, txt2, size = "40"){
	let place = document.getElementById( location );
	let LAB = document.createElement("label");
	LAB.setAttribute("for", idNam);
	LAB.appendChild( document.createTextNode( txt1 ) );
	place.appendChild( LAB );
	let compo = document.createElement("input");
	compo.setAttribute("type","text");
	compo.setAttribute("id", idNam);
	compo.setAttribute("maxlength", "40"); 
	compo.setAttribute("size", size); 
	compo.setAttribute("value",txt2);
	place.appendChild( compo );
}

// ラジオボタン生成 
function addRadioForm( location, chk, buttnName, txtArr, clicFunc = "" ){
	let place = document.getElementById( location );
	let Bform = document.createElement("form");
	Bform.setAttribute("name", buttnName);
	place.appendChild( Bform );
	for ( let i = 0; i < txtArr.length; i++ ){
		let LAB = document.createElement("label");
		let compo = document.createElement("input");
		compo.setAttribute("type","radio");
		compo.setAttribute("name", "ChoiceOP");
		compo.setAttribute("value", i);
		if (chk === i ){ compo.checked = "checked"; }
		compo.setAttribute("onclick", clicFunc);
		LAB.appendChild( compo );
		let Btxt = document.createTextNode( txtArr[i] + " " );
		LAB.appendChild(Btxt);
		Bform.appendChild( LAB );
	}
}

//  時間変更用インプットボックス(time)生成
function addDateForm( location, idNam ){
	let place = document.getElementById( location );
	LAB = document.createElement("label");
	LAB.setAttribute("for", idNam + "-date");
	LabeTxt = document.createTextNode( "日付：" );
	LAB.appendChild(LabeTxt);
	place.appendChild( LAB );
	compo = document.createElement("input");
	compo.setAttribute("type","date");
	compo.setAttribute("id", idNam + "-date");
	place.appendChild( compo );
	LAB = document.createElement("label");
	LAB.setAttribute("for", idNam + "-start");
	LabeTxt = document.createTextNode( " 開始時間：" );
	LAB.appendChild(LabeTxt);
	place.appendChild( LAB );
	compo = document.createElement("input");
	compo.setAttribute("type","time");
	compo.setAttribute("id", idNam + "-start");
	place.appendChild( compo );
	LAB = document.createElement("label");
	LAB.setAttribute("for", idNam + "-end");
	LabeTxt = document.createTextNode( " 終了時間：" );
	LAB.appendChild(LabeTxt);
	place.appendChild( LAB );
	compo = document.createElement("input");
	compo.setAttribute("type","time");
	compo.setAttribute("id", idNam + "-end");
	place.appendChild( compo );
}

//  ポイント情報インプットボックス(time)生成
function addOneTimeForm( location, idNam ){
	let place = document.getElementById( location );
	LAB = document.createElement("label");
	LAB.setAttribute("for", idNam);
	LabeTxt = document.createTextNode( "ポイントの時間：" );
	LAB.appendChild(LabeTxt);
	place.appendChild( LAB );
	compo = document.createElement("input");
	compo.setAttribute("type","time");
	compo.setAttribute("step","1");
	compo.setAttribute("id", idNam);
	place.appendChild( compo );
}

// テキストエリア生成
function addTxtBox( location, idNam ){
	let place = document.getElementById( location );
	let compo = document.createElement("textarea");
	compo.setAttribute("id", idNam);
	compo.setAttribute("rows","5"); 
	compo.setAttribute("cols","50"); 
	place.appendChild( compo );
//console.log(compo);
}

// ファイル出力リンク作成
function addSaveLink( location ){
	let place = document.getElementById( location );
	let SPN = document.createElement("span");
	SPN.style = "border: 1px solid #000000; background-color: #dcdcdc";
	let LinKtxt = document.createTextNode( "保存" );
	SPN.appendChild(LinKtxt);
	let compo = document.createElement("a");
	compo.setAttribute("id", "saveLocal");
//	compo.setAttribute("href", "javascript:savelog();");
	compo.setAttribute("href", "javascript:void(0);");
	compo.setAttribute("onclick", "savelog();");
	compo.appendChild( SPN );
	place.appendChild( compo );
}
