// //////////////// スタートアップ  //////////////// 

mode_sel("make");
document.getElementById("mapWin1").style.cursor = "crosshair"
DrwMap();

// //////////////// ファイル入力 //////////////////
// ドラッグ&ドロップ
const dropArea = document.body; // 許可する領域
dropArea.addEventListener("dragover", event => {
	event.preventDefault();
	event.dataTransfer.dropEffect = "copy";
});
dropArea.addEventListener("drop", event => {
	event.preventDefault();
	var files = event.dataTransfer.files;
	getFiles(files);
});
function getFiles(files){
	for (let file of files){
		var reader = new FileReader();
		reader.readAsText(file); 
		reader.onload = event => {
			var readTxt = event.target.result;
			GpxFileName = file.name.split(".")[0]; // 入力ファイルの拡張子無しファイル名
			after_file_read(readTxt, GpxFileName);
		}
	}
}

// ファイル選択ボタン入力
var obj1 = document.getElementById("selfile");
obj1.addEventListener("change",function(event){
	var file = event.target.files;
	var input = document.querySelector("#selfile").files[0];
	var reader = new FileReader();  // FileReaderの作成
	reader.readAsText(file[0]);
	reader.onload = function(){
		readTxt = reader.result;
		GpxFileName = input.name.split(".")[0];
		after_file_read(readTxt, GpxFileName);
	 }
},false);

function after_file_read(readTxt, GpxFileName){
	let fieChk = 0;
	if ( readTxt.indexOf("</gpx>") != -1 && readTxt.indexOf("<gpx") != -1 ){
		fieChk = 1;
	}else if ( readTxt.indexOf("</kml>") != -1 && readTxt.indexOf("<kml") != -1 ){
		fieChk = 2;
	}
	if ( fieChk === 1 ){ // GPXファイル
		if ( chkRoteName(GpxFileName) ){
			alert( GpxFileName + "は同名のルートがあります。\nルート名を変更してください。");
		}else{
			make_RouteList(readTxt, GpxFileName);
			dsp_routeList()
		}
	}else if ( fieChk === 2 ){ //KMLファイル
		if ( chkRoteName(GpxFileName) ){
			alert( GpxFileName + "は同名のルートがあります。\nルート名を変更してください。");
		}else{
			kml_inport(readTxt, GpxFileName);
			dsp_routeList()
		}
	}else{
		alert( GpxFileName + "はGPX/KMLファイルではありません");
//		document.getElementById("txt_area").value = readTxt;
	}
}

// ルートプロファイルの登録 & ルート描画
function make_RouteList( txtStr, routeName, mapfit = 0 ){
	RidNum++;
	let routeId = "R"+String(RidNum);
	RouteList[routeId] = [ routeName, strCount(txtStr, '</trk>'), strCount(txtStr, '</wpt>') ];
	let HeadWpt = check_wpt( txtStr );
	Header[routeId] = [ HeadWpt[0], HeadWpt[1], txtStr.substring( txtStr.lastIndexOf("</trkseg>"),  txtStr.lastIndexOf("</gpx>") ), txtStr.substring( txtStr.lastIndexOf("</gpx>") ) ];
	let txtBlock = HeadWpt[2].split('<trk>');
	let trkName = [], trkSeg = [], trkptNum = [];
	for (let i = 1; i < txtBlock.length; i++){
		let TrTxt = "<trk>" + txtBlock[ i ].substring( 0, txtBlock[ i ].indexOf( "<trkpt" ) );
		trkName.push( TrTxt );
		let SeTxt = txtBlock[ i ].substring(  txtBlock[ i ].indexOf( "<trkpt" ), txtBlock[ i ].indexOf( "</trkseg>") );
		trkSeg.push( SeTxt );
	}
	Track[routeId] = trkName.slice();
	TrksegTxt[routeId] = trkSeg.slice();
	for ( let i = 0; i < trkSeg.length; i++ ){ trkptNum.push(strCount(trkSeg[ i ], '</trkpt>') ); }
	RouteList[routeId].push( trkptNum );
  // track毎のラインと始終点を地図に追加、重複するtrkptを除去
	let latlonAll = [], lineArr = [], iconArr = [];
	for ( let i = 0; i < RouteList[routeId][1]; i++ ){
		let trksegTxt = TrksegTxt[routeId][ i ];
		let latlon = [], trksegNew = "", Point = 0, trkptTxtPre = "";
		while (Point != -1 ){ // latlon配列作成ループ
			let trkpDat = get_trkptDat(trksegTxt, Point);
			Point = trkpDat[0];
			if ( trkpDat[0] != -1 ){ 
				if ( trkptTxtPre != trkpDat[5] ){ // trkptが重複する場合latlon/trksegNewは書込まない
					latlon.push( [ trkpDat[1], trkpDat[2] ] );
					trksegNew += trkpDat[5];
				}
				trkptTxtPre = trkpDat[5];
				Point++;
			}
		}
		TrksegTxt[routeId][ i ] = trksegNew;
		let RTid = `${routeId}T${String( i+1 )}`;
		let DrawDat = draw_trackLine( RTid, latlon, 'red' ); // line, icon 描画
		lineArr.push( DrawDat[0] );
		iconArr.push( DrawDat[1], DrawDat[2] );
		latlonAll = latlonAll.concat(latlon);
	}
	if (mapfit === 0 ){ mymap.fitBounds( latlonAll ); }
	RLines[routeId] = lineArr.slice();
	RIcons[routeId] = iconArr.slice();
	if ( ActRoute != "" ){ // V2.2 前ActRouteの色を紫にする
		del_routeLine( ActRoute );
		drw_routelineColo( ActRoute, "mediumorchid" );
	}
	ActRoute = routeId; // V2.2
	modeChange();
	return routeId; // V2.2
}

// ヘッダー、ウェイポイント、trkseg 分離
function check_wpt( entTxt ){
	let chkTxt = entTxt.split("<wpt");
	let Otxt = "", Wtxt = "";
	for ( let i = 0; i < chkTxt.length; i++ ){ if ( chkTxt[ i ].indexOf("</wpt>") != -1){ chkTxt[ i ] =  "<wpt" + chkTxt[ i ]; } }
	for ( let i = 0; i < chkTxt.length; i++ ){
		if ( chkTxt[ i ].indexOf("</wpt>") != -1){ 
			let TPtxt = chkTxt[ i ].split("</wpt>");
			Wtxt += TPtxt[ 0 ] + "</wpt>\n";
			let CHK = TPtxt[ 1 ].indexOf("<") ;
			if ( CHK != -1 && CHK != 0){ Otxt += TPtxt[ 1 ].substring( CHK ); }
		}else{
			Otxt +=  chkTxt[ i ];
		}
	}
	let Htxt = Otxt.substring( 0, Otxt.indexOf("<trk>") );
	let Ttxt = Otxt.substring( Otxt.indexOf("<trk>") )
	return [ Htxt, Wtxt,  Ttxt ];
}

// KML→GPX変換
function kml_inport( txtStr, routeName  ){
	let Folder = [], routeTxt = HeaderTxt, trkTxt = "", wptTxt = "";;
	if ( txtStr.indexOf( "<Folder>" ) != -1 ){ // Folder(トラック)配列作成(txtStr:<Folder>で分割)
		Folder = txtStr.split( "<Folder>" ); 
		Folder.shift();
	}else{
		Folder = [txtStr];
	}
	for ( let i = 0; i < Folder.length ; i++ ){
		let PT = 0, PlaceM = [], wptArr = [], trkptArr = [], trkName = "";
		while( PT != -1 ){ // Placemarkの配列作成( PlaceM:<Placemark>で分割)
			PT = Folder[ i ].indexOf( "<Placemark>", PT );
			if ( PT != -1 ){
				PlaceM.push( Folder[ i ].substring( PT, Folder[ i ].indexOf( "</Placemark>", PT ) ) );
				PT++;
			}
		}
		for ( let j = 0; j < PlaceM.length; j++ ){
			let codtxt = "";
			if ( PlaceM[ j ].indexOf( "<Point>" ) != -1 ){ // wptArr配列
				codtxt = PlaceM[ j ].substring( PlaceM[ j ].indexOf( "<coordinates>" ) + 13, PlaceM[ j ].indexOf( "</coordinates>" ) );
				let LonLatEle = codtxt.split(",");
				if ( LonLatEle.length < 3 ){ LonLatEle[2] = "0"; }
				let Lon = Number( LonLatEle[0] ), Lat = Number( LonLatEle[1] ), Ele = Number( LonLatEle[2] );
 				let wptNam= PlaceM[ j ].substring( PlaceM[ j ].indexOf("<name>") + 6,  PlaceM[ j ].indexOf( "</name>" ) );
				let flg = 0; // wpt重複防止
				for (let k = 0; k < wptArr.length; k++){ if (wptArr[ k ][0] === Lon && wptArr[ k ][1] === Lat ){ flg = 1 } }
				if ( flg === 0 ){ wptArr.push( [Lon, Lat, Ele, wptNam ] ); }
			}
			if ( PlaceM[ j ].indexOf( "<LineString>" ) != -1 ){ // trkptArr配列
				trkName = PlaceM[ j ].substring( PlaceM[ j ].indexOf("<name>") + 6,  PlaceM[ j ].indexOf( "</name>" ) );
				codtxt = PlaceM[ j ].substring( PlaceM[ j ].indexOf( "<coordinates>" ) + 13, PlaceM[ j ].indexOf( "</coordinates>" ) );
				codtxt = codtxt.replace( /\n/g, " ");
				let ArrTmp = codtxt.split(" "), codArr =[];
				for ( let k = 0; k < ArrTmp.length; k++ ){ // trkpt毎の配列作成(codArr)
					let LonLatEle = ArrTmp[ k ].split(",");
					if (LonLatEle.length > 1 ){ 
						if ( LonLatEle.length < 3 ){ LonLatEle[2] = 0; }
						trkptArr.push( [ Number(LonLatEle[0]), Number(LonLatEle[1]), Number(LonLatEle[2]) ] ); 
					}
				}
			}
		}
		for ( let j = 0; j < wptArr.length; j++ ){ // wptがtrkptArrに無ければ直近trkptに追加
			let MinIdx = 0, d1 = 800;
			for ( let k = 0; k < trkptArr.length; k++ ){
				let d2 = Math.abs( wptArr[ j ][0] - trkptArr[ k ][0] ) ** 2 + Math.abs( wptArr[ j ][1] - trkptArr[ k ][1]  ) ** 2;
				if ( d2 === 0 ){ MinIdx = k; break; }
				if ( d1 > d2 ){ MinIdx = k; d1 = d2; }
			}
			if ( d1 != 0 ){
				if ( MinIdx === 0 ){ 
					trkptArr.unshift( wptArr[ j ] ); 
				}else if ( MinIdx === trkptArr.length -1 ){
					 trkptArr.push( wptArr[ j ] ); 
				}else{
					let d3 = Math.abs( wptArr[ j ][0] - trkptArr[ MinIdx -1 ][0] ) ** 2 + Math.abs( wptArr[ j ][1] - trkptArr[ MinIdx -1 ][1]  ) ** 2;
					let d4 = Math.abs( wptArr[ j ][0] - trkptArr[ MinIdx +1 ][0] ) ** 2 + Math.abs( wptArr[ j ][1] - trkptArr[ MinIdx +1 ][1]  ) ** 2;
					( d3 >= d4 ) ? trkptArr.splice( MinIdx -1, 0, wptArr[ j ] ): trkptArr.splice( MinIdx +1, 0, wptArr[ j ] ); 
				}
			}
		}
		for ( let j = 0; j < wptArr.length; j++ ){
			wptTxt += `<wpt lat="${wptArr[ j ][1]}" lon="${wptArr[ j ][0]}" >\n<name>${wptArr[ j ][3]}</name>\n`
			wptTxt += `<<cmt></cmt>\n<desc></desc>\n</wpt>\n`;
		}
		trkTxt += `<trk><name>${trkName}</name><trkseg>\n`;
		for ( let j = 0; j < trkptArr.length; j++ ){
			trkTxt += `<trkpt lat="${trkptArr[ j ][1]}" lon="${trkptArr[ j ][0]}">`;
			trkTxt += `<ele>${trkptArr[ j ][2]}</ele></trkpt>\n`
		}
		trkTxt += "</trkseg></trk>\n";
	}
	routeTxt += wptTxt + trkTxt + "</gpx>\n";
	make_RouteList( routeTxt, routeName );
}

// /////////////////////////   地図操作   //////////////////////// 

// 地図のclickイベント(編集マーカー及び編集ライン(青)の設置)【make】
function MapClick(e){
	if ( mode != "make" ){ return; }
	if ( Object.keys(LmarkerList).length === 0 ){
		markN = 0;
		MarkerLine = L.polyline([], { color: 'blue', weight: 5, bubblingMouseEvents: false }).addTo(mymap);
	}
	markN++;
	let mkName = "m" + markN;
	let mark = L.marker(e.latlng, {title:mkName, icon:Markicon, draggable:true, bubblingMouseEvents:false }).on('click', MarkerClick).on("dragend", MarkerDrag).on('dragstart', InhibitClick).addTo(mymap);
	LmarkerList[mkName] = mark;
	let indx = Object.keys(LmarkerList).length;
	LmarkerIndex[  String( indx ) ] = [ mkName, [e.latlng.lat,  e.latlng.lng] ];
	MarkerLine.addLatLng(e.latlng);
	let DTile = chk_eleTile(e.latlng.lat, e.latlng.lng); // 標高タイルチェック
	if ( DTile.length != 0){ (async function (){ await get_tile( DTile[0],  DTile[1] ); }()); }
	return;
}

// 編集／wptマーカーclick (削除【make】【edit】、マーカー情報表示【wptEdit】)
function MarkerClick(e){
	let delMark = e.target.options.title;
	if ( mode === "wptEdit" ){ 
		disp_wptInfor(e);
		return; 
	}
	if ( mode === "edit" ){ // 始点と終点は削除しない
		if ( delMark === "m0" ||  delMark === LmarkerIndex[ String( Object.keys(LmarkerIndex).length) ][0] ){ return; }
	}
	mymap.removeLayer(e.target);
	delete LmarkerList[delMark];
	let k = 0;
	let tmpArr = {};
	for ( let i = 1 ; i < Object.keys(LmarkerIndex).length + 1; i++){
		let chkM = LmarkerIndex[ String( i ) ];
		if ( chkM[0] === delMark ){
			k = 1;
			if ( mode === "edit" ){ // editではLmarkerIndex[i]は削除せず識別コードを追加
				tmpArr[ String( i ) ] = LmarkerIndex[ String( i ) ];
				tmpArr[ String( i ) ][2] = 3;
				k = 0;
			}
		}else{
			tmpArr[ String(i- k) ] = LmarkerIndex[ String( i ) ];
		}
	}
	LmarkerIndex = Object.assign({}, tmpArr);
	MarkerLine.setLatLngs([]); // 青ライン消去
	MarkerLine.setLatLngs([mk_newLatLng(LmarkerIndex)]); // 青ライン再描画
}

// wptマーカー右Click (削除【wptEdit】)
function MarkerClickRt(e){
	let markNam = e.target.options.title;
	mymap.removeLayer(e.target);
	delete LmarkerList[markNam];
	for ( let index in LmarkerIndex ){
		if ( LmarkerIndex[ index ][0] === markNam ){
			delete LmarkerIndex[ index ];
			break;
		}
	}
	replace_wptTxt();
	document.getElementById("trk1").value = "";
	document.getElementById("trk2").value = "";
	document.getElementById("trk3").value = "";
}

// start goal マーカークリック処理 【全モード】
function SGmarkClick(e){
	if ( mode === "make" ){ MapClick(e); return; } // makeモード マーカー追加
	if ( mode === "wptEdit" ){ put_wptMark( e.latlng.lat, e.latlng.lng ); return; } // wptEditモード マーカー追加
	let markerTitl = e.target.options.title;
	let trckNumber = parseInt( markerTitl.split("T")[1], 10 );
	let routeId =  markerTitl.split("T")[0];
	if ( Object.keys(ChoseRoute).length != 0 ){
		let deleLin = ChoseRoute[ routeId ];
		for ( let i = 0; i < deleLin.length; i++ ){ mymap.removeLayer( deleLin[i] );  }
		delete ChoseRoute[ routeId ];
		return;
	}	
	trksegTxt = TrksegTxt[ routeId ][trckNumber -1 ]
	let latlon = make_LatlonFmTrkTxt( trksegTxt )
	let NpInfo = nearPt_trkLinArr(  e.target._latlng.lat, e.target._latlng.lng, latlon );
	trkLine_crkOpe( routeId, trckNumber, NpInfo );
	return;
}

// 編集マーカー Dragでのクリック誤認防止【make】【edit】
function InhibitClick(e){
	 mymap.off('click', MapClick);
}

// 編集マーカーDrag (マーカーの移動、LmarkerList/LmarkerIndexの更新、マーカー間ライン(青)の再描画)【make】【edit】
function MarkerDrag(e){
	let marker = e.target.options.title;
	let latM = e.target._latlng.lat;
	let lonM = e.target._latlng.lng;
	for ( let i = 1 ; i < Object.keys(LmarkerIndex).length + 1; i++){
		let chkM = LmarkerIndex[ String( i ) ], IDC = LmarkerIndex[ String( i ) ][2];
		if (IDC != 2){ IDC = 1; }
		if ( chkM[0] === marker ){
			let changeP = [ marker, [latM, lonM ], IDC ];
			LmarkerIndex[ String( i ) ] = changeP;
			break;
		}
	}
	MarkerLine.setLatLngs([]);
	MarkerLine.setLatLngs([mk_newLatLng(LmarkerIndex)]);
	setTimeout( function(){ mymap.on('click', MapClick); }, 10); // 誤クリック防止でoffにしたMapClickをonにする
	let DTile = chk_eleTile( latM,  lonM ); // 標高タイルチェック
	if ( DTile.length != 0){ (async function (){ await get_tile( DTile[0],  DTile[1] ); }()); }
}

// LmarkerIndex{}からライン書き換え用のlatlon配列を作成
function mk_newLatLng(LmarkerIndex){
	let newLatLonStr = [];
	for ( let i = 0; i < Object.keys(LmarkerIndex).length; i++ ){
		let MarkD = LmarkerIndex[  String(i+1)  ];
		if (  LmarkerIndex[  String(i+1)  ][2] != 3 ){ newLatLonStr.push(MarkD[1]); }
	}
	return newLatLonStr;
}

// trackライン(赤/紫)のclick【全モード】V2.2 アクティブルートの切替関連を変更
function TrackClick(e){
	if ( mode === "make" ){ MapClick(e); return; } // makeモードはラインを無視
	let lineTitl = e.target.options.title;
	let trckNumber = Number( lineTitl.split("T")[1] );
	let routeId =  lineTitl.split("T")[0];
	let Llatlngs = e.target._latlngs.slice();
	let latlons = [];  // ライン上でクリックポイントに一番近いtrkptを求める
	for ( let i = 0; i < Llatlngs.length; i++ ){ latlons.push ( [ Llatlngs[ i ]["lat"], Llatlngs[ i ]["lng"] ] ); }
	let NpInfo = nearPt_trkLinArr( e.latlng.lat, e.latlng.lng, latlons );
	trkLine_crkOpe( routeId, trckNumber, NpInfo );
	return;
}

// 編集ライン(青)のクリックでマーカー追加 
function LineClick(e){
//console.log(LmarkerIndex);
	let CP = [ e.latlng.lat, e.latlng.lng ];
	let LatLons = mk_newLatLng(LmarkerIndex);
	let NpInfo = nearPt_trkLinArr(CP[0], CP[1], LatLons);
	let nearPt = NpInfo[0], Mark1 = NpInfo[1];
	markN++;
	let mkName = "m" + markN;
	let mark = L.marker(CP, {title:mkName, icon:Markicon, draggable:true}).on('click', MarkerClick).on("dragend", MarkerDrag).on('dragstart', InhibitClick).addTo(mymap);
	LmarkerList[mkName] = mark;
	let LmarkerIndexTmp = {};
	let LineCount = 0, MarkCount = 1;
	while( LineCount < Mark1 ){
		LmarkerIndexTmp[ String( MarkCount ) ] = LmarkerIndex[ String( MarkCount ) ].slice();
		if (  LmarkerIndex[ String( MarkCount ) ][2] != 3 ){ LineCount++; }
		MarkCount++;
	}
	LmarkerIndexTmp[ String( MarkCount ) ] = [ mkName, CP, 2 ];
	for ( let i = MarkCount; i < Object.keys(LmarkerIndex).length +1; i++ ){ LmarkerIndexTmp[ String( i + 1 ) ] = LmarkerIndex[ String( i ) ].slice(); }
	LmarkerIndex = {};
	LmarkerIndex = Object.assign({}, LmarkerIndexTmp);
	MarkerLine.setLatLngs([]);
	MarkerLine.setLatLngs( [mk_newLatLng(LmarkerIndex)] );
	let DTile = chk_eleTile( CP[0], CP[1] ); // 標高タイルチェック
	if ( DTile.length != 0){ (async function (){ await get_tile( DTile[0],  DTile[1] ); }()); }
}

// 選択ルートのclickイベント(キャンセル) 
function  SelectRouteClick(e){
	let lineTitl = e.target.options.title;
	let routeId =  lineTitl.split("T")[0];
	if ( mode === "wptEdit" ){
		wtpLine_click(e);
		return;
	}
	let deleLin = ChoseRoute[ routeId ];
	for ( let i = 0; i < deleLin.length; i++ ){ mymap.removeLayer( deleLin[i] );  }
	delete ChoseRoute[ routeId ];
	WrtMessage1("");
}

// DIマーカーのclickイベント(削除) 【divide, Pinfo】
function MarkerClickDiv(e){
	if (  Object.keys(DevideMark).length === 1 ){
		DevideMark = {};
		WrtMessage1("");	WrtMessage2("");
	}else{
		if ( DevideMark[ "1" ].mark ===  e.target ){
			delete DevideMark[ "1" ];
		}else{
			DevideMark[ "0" ] = { ...DevideMark[ "1" ] };
			delete DevideMark[ "1" ];
		}
	}
	mymap.removeLayer(e.target);
	if ( mode === "divide" ){  
		document.getElementById("trk1").value = "ルート名-1";
		document.getElementById("trk2").value = "ルート名-2";
	}
	if ( mode === "Pinfo" ){ document.getElementById("ChgTime").value = ""; }
	dsp_routeInfo( ActRoute );
}

// クリックポイント(lat, lon)に最も近いLinePlot上の緯度経度(latlons)を求める 
//  返値：[ [近傍点の緯度、経度], ClickPtから先の次のLinePlotインデックス番号(1~n),  nearPtのマーカーインデックス番号(0~n)]
function nearPt_trkLinArr(lat, lon, LineDat){
	let ClickPt = [ lat, lon ];
	let chkPt1 = LineDat[0].slice();
	let nearPt = chkPt1.slice();
	let Delta = 10;  let DeltaP, L0, L1, L2; let mark = lineIdx = 0;
	for ( let i = 1 ; i < LineDat.length; i++ ){
		let chkPt2 = LineDat[i].slice();
		L0 = Math.sqrt( (chkPt2[0] - chkPt1[0])**2 + (chkPt2[1] - chkPt1[1])**2 );
		L1 = Math.sqrt( (ClickPt[0] - chkPt1[0])**2 + (ClickPt[1] - chkPt1[1])**2 );
		L2 = Math.sqrt( (ClickPt[0] - chkPt2[0])**2 + (ClickPt[1] - chkPt2[1])**2 );
		DeltaP = L1 + L2 - L0;
		if ( Delta > DeltaP ){
			 Delta = DeltaP;
			 if ( L1 < L2 ){
			 	nearPt = chkPt1.slice()
			 	mark = i - 1; // nearPtのマーカーインデックス番号(0~n)
			 }else{
			 	nearPt = chkPt2.slice();
			 	mark = i;
			 }
			 lineIdx = i; // クリックポイントが何番目のライン上かのインデックス番号(1~n)
		}
		chkPt1 = chkPt2.slice();
	}
	return [ nearPt, lineIdx, mark ];
}


// ////////////////////  標高データ操作関連   //////////////////////

// 緯度,経度,ズームレベルからタイル座標、ピクセル座標を求める
// 引数：(緯度, 緯度, ズームレベル) 返値：[ tX, tY,  tpX, tpY ] タイル座標X,Y、タイル内ピクセル座標X,Y、
function latLon2tile(latVal, lonVal, zoomVal){ 
	const LonMax = 85.05112878; // 最大緯度
	let lat = parseFloat(latVal); // 緯度
	let lon = parseFloat(lonVal); // 経度
	let zoom = parseInt(zoomVal); // ズームレベル
  // ピクセル座標
	let pX = parseInt(Math.pow(2, zoom + 7) * (lon / 180 + 1));
	let pY = parseInt((Math.pow(2, zoom + 7) / Math.PI) * ((-1 * Math.atanh(Math.sin((Math.PI / 180) * lat))) + Math.atanh(Math.sin((Math.PI / 180) * LonMax ))));
  // タイル座標
	let tX = parseInt(pX / 256);
	let tY = parseInt(pY / 256);
  // タイル内ピクセル座標
	let tpX = pX % tX + 1;
	let tpY = pY % tY + 1;
	return [ tX, tY, tpX, tpY ];
}

// ＊＊＊＊＊＊＊ 標高タイル ダウンロード ＊＊＊＊＊＊＊

// サーバーから標高タイルを取得、eleTile = {} に zoom/tileX/tileY のキーで格納
// DEM5が無いか "e" が入っている時はDEM10をダウンロード
async function get_tile( tileX,  tileY ){
	let url15 = `https://cyberjapandata.gsi.go.jp/xyz/dem5a/15/${tileX}/${tileY}.txt`;
	const response = await fetch( url15 );
	let readTxt = await response.text();
	if ( response.status === 200 ){ eleTile[`15/${tileX}/${tileY}`] = readTxt; }
	if ( readTxt.indexOf("e") != -1 || response.status === 400 ){
		let url14 = `https://cyberjapandata.gsi.go.jp/xyz/dem/14/${ Math.floor(tileX/2) }/${ Math.floor(tileY/2) }.txt`;
		const response = await fetch( url14 );
		readTxt = await response.text();
		if ( response.status === 200 ){ eleTile[`14/${ Math.floor(tileX/2) }/${ Math.floor(tileY/2) }`] = readTxt; }
	}
	return new Promise( function (resolve, reject) { resolve() });
}

// ダウンロード済みタイルからlat, lon座標の標高値を得る。戻り値は標高(数値)
function get_Ele( lat, lon ){
	let tileInfo = latLon2tile( lat, lon, 15 );
	let tileKey = `${15}/${tileInfo[0]}/${tileInfo[1]}`;
	let tileTxt = "", eledat = "";
	if (eleTile.hasOwnProperty(tileKey) === true ){
		tileTxt = eleTile[tileKey]; 
		eledat = get_tipixEle( tileInfo[2], tileInfo[3], tileTxt );
		if ( eledat === "e" ){
			tileInfo = latLon2tile( lat, lon, 14 );
			tileKey = `${14}/${tileInfo[0]}/${tileInfo[1]}`;
			tileTxt = eleTile[tileKey]; 
		eledat = get_tipixEle( tileInfo[2], tileInfo[3], tileTxt );
		}
	}else{ 
		tileInfo = latLon2tile( lat, lon, 14 );
		tileKey = `${14}/${tileInfo[0]}/${tileInfo[1]}`;
		tileTxt = eleTile[tileKey]; 
		eledat = get_tipixEle( tileInfo[2], tileInfo[3], tileTxt );
	}
	return Number(eledat) ;
}

// 標高タイル内ピクセル座標の値を取り出す
// 引数：タイル内ピクセル座標X,Y、tileTxtデータ  返値：標高値(ストリング)または "e"
function get_tipixEle( tpX, tpY, tileTxt ){ 
	let PT = 0, PT2 = 0;
	if ( tpY > 1){ for (let i = 0; i < tpY -1 ; i++){ PT = tileTxt.indexOf("\n", PT + 1); } }
	if ( tpX > 1){ for (let i = 0; i <tpX -1 ; i++){ PT = tileTxt.indexOf( ","  , PT + 1); } }
	(tpX <= 255) ? PT2 = tileTxt.indexOf(",", PT+1): PT2 = tileTxt.indexOf("\n", PT+1);
	( PT == 0 ) ? PT = 0: PT = PT + 1;
	return tileTxt.substring( PT, PT2);
}


// 開始から終了時間までを緯度経度と標高配列に従って配分し、ISOフォーマットの時間配列を作成
function make_timeArr( latlonArr, eleArr, startTime, endTime ){
	let startTmObj = new Date( startTime);
	let endTmObj = new Date( endTime);
	let timeDiffS2E = endTmObj.getTime() - startTmObj.getTime();
	let timeArr = [ startTmObj.toISOString().split('.')[0] +"Z" ], TrFactor = [];
	for ( let i = 0; i < latlonArr.length - 1; i++ ){
		let lat1 = latlonArr[ i ][0], lon1 = latlonArr[ i ][1], ele1 = eleArr[ i ];
		let lat2 = latlonArr[ i + 1][0], lon2 = latlonArr[ i +1 ][1], ele2 = eleArr[ i +1 ];
		let DS = get_DiSr(lat1, lon1, lat2, lon2, ele1, ele2 );
		TrFactor.push( DS[0] / DS[1] );
	}
	let TimeRate = timeDiffS2E / ( TrFactor.reduce((sum, element) => sum + element, 0) );
	for ( let i = 0; i < TrFactor.length - 1; i++ ){
		let addTime = TrFactor[i] * TimeRate;
		startTmObj.setMilliseconds( startTmObj.getMilliseconds() + addTime );
		timeArr.push( startTmObj.toISOString().split('.')[0] + "Z" );
	}
	timeArr.push( endTmObj.toISOString().split('.')[0] + "Z" );
	return timeArr;
}
// ２点間の経緯度と標高から、距離と速度係数を返す
function get_DiSr(lat1, lon1, lat2, lon2, ele1, ele2 ){
	let PtDis = hubeny(lat1, lon1, lat2, lon2);
	let PtEle = ele2 - ele1; 
	let Balo, SR;
	( PtDis === 0) ?  Balo = 0: Balo = PtEle / PtDis;
	if ( Balo >= UpTh2){ 
		SR = SrUpS;
	}else if ((UpTh2 > Balo) && (Balo >= UpTh1)){ 
		SR = SrUp;
	}else if ((UpTh1 > Balo) && ( Balo > DwnTh1)){ 
		SR = 1;
	}else if ((DwnTh1 >= Balo) && (Balo > DwnTh2)){ 
		SR = SrDwn;
	}else if ( DwnTh2 >= Balo ){
		SR = SrDwnS;
	}
	return [ PtDis, SR ];
}


// //////////////// 各作業モードでのtrack選択時の設定 //////////////////
// ---------- track line クリック時のモード別動作 ----------
function trkLine_crkOpe( routeId, trckNumber, NpInfo ){
	switch (mode){
		case "divide": case "remove": case "Pinfo":
			if (( mode === "divide" || mode === "remove" ) && Object.keys(DevideMark).length != 0 && routeId != ActRoute ){ return; } // V2.2
			change_ActColor( routeId );
			put_DImarker( routeId, trckNumber, NpInfo );
			break;
		case "decimate": case "NaChang": case "reverse": case "EleRepl": case "save": case "TmChang":
			change_ActColor( routeId );
			break;
		case "merge":
			if (Object.keys(ChoseRoute).length === 0 ){
				del_routeLine( routeId );
				ChoseRoute[routeId] = drw_routelineColo( routeId, "yellow" );
				ActRoute = MergAct = routeId;
			}else if ( Object.keys(ChoseRoute).length === 1 ){
				if ( routeId === Object.keys(ChoseRoute)[0] ){// 選択解除
					if (Object.keys(RouteList).length === 1){return;}
					del_routeLine( routeId ); drw_routelineColo( routeId, "mediumorchid" );
					delete ChoseRoute[ routeId ];
					ActRoute = MergAct = "";
				}else{ // 選択追加
					ActRoute = Object.keys(ChoseRoute)[0];
					del_routeLine( routeId );
					ChoseRoute[routeId] = drw_routelineColo( routeId, "yellow" );
				}
			}else{ // (ChoseRoute).length === 2
				if ( Object.keys(ChoseRoute).includes(routeId) ){ // 選択解除				
					del_routeLine( routeId ); drw_routelineColo( routeId, "mediumorchid" );
					delete ChoseRoute[ routeId ];
					if ( Object.keys(ChoseRoute)[0] != MergAct ){ // AcrRoute変更
						ActRoute = MergAct = Object.keys(ChoseRoute)[0];
					}
				}
			}
			break;
		case "edit":
			if ( Object.keys(EditRtTr).length != 0 ){ return; }
			change_ActColor( routeId );
			drw_MarkerLine( routeId, trckNumber, NpInfo );
			break;
		case "delete":
			delete_route( routeId );
			return;
		case "wptEdit":
			if ( ActRoute === "" ){
				change_ActColor( routeId );
				place_wptMark( routeId );
			}else{
				if ( routeId != ActRoute ){ return; }
				add_wptMark( NpInfo[0][0], NpInfo[0][1] );
			}
			break;
	}
	dsp_routeInfo( routeId, trckNumber, NpInfo );
}

// DImarker 設置し DevideMark に登録【divide, remove, Pinfo】
function put_DImarker( routeId, trckNumber, NpInfo ){
	if ( ( mode ===  "Pinfo" || mode === "divide" ) && Object.keys(DevideMark).length != 0 ){
	 	mymap.removeLayer(DevideMark["0"].mark);
	 	DevideMark = {};
		WrtMessage1("");
	 }
	let nearPt = NpInfo[0];
	if ( Object.keys(DevideMark).length === 0 ){
		let PointMark = L.marker(nearPt).on('click', MarkerClickDiv).addTo(mymap);
		DevideMark[ "0" ] = { route:routeId , track:trckNumber, indx:NpInfo[2], mark:PointMark };
	}else if ( mode === "remove" && Object.keys(DevideMark).length < 2 ){
		if ( DevideMark["0"].route === routeId ){
			let PointMark = L.marker(nearPt).on('click', MarkerClickDiv).addTo(mymap);
			DevideMark[ "1" ] = { route:routeId , track:trckNumber, indx:NpInfo[2], mark:PointMark };
		}
	}
}

//  編集マーカー(最大601個、trkptが600ポイント以下は全部)と仮ライン(青)の設定【edit】
function drw_MarkerLine( routeId, trckNumber, NpInfo ){
	if ( Object.keys(LmarkerList).length != 0 ){ return; }
	let MBindex = 0;
	( NpInfo[2] < 300 ) ? MBindex = 0: MBindex =  NpInfo[2] - 300;
	let PsegTxt = TrksegTxt[ routeId ][ trckNumber -1 ];
	if ( MBindex != 0 ){ 
		let tmpTxt = spl_trkseg( PsegTxt, MBindex ); 
		PsegTxt = tmpTxt[1];
	}
	if ( strCount( PsegTxt, "</trkpt>") > 600 ){
		let tmpTxt = spl_trkseg( PsegTxt, 601 ); 
		PsegTxt = tmpTxt[0];
	}
	let latlon = make_LatlonFmTrkTxt( PsegTxt );
	markN = 0;
	for (let i = 0; i < latlon.length; i++ ){
		let mkName = "m" + markN;
		let mark = L.marker(latlon[i], {title:mkName, icon:Markicon, draggable:true}).on('click', MarkerClick).on("dragend", MarkerDrag).on('dragstart', InhibitClick).addTo(mymap);
		LmarkerList[mkName] = mark;
		let indx = Object.keys(LmarkerList).length;
		LmarkerIndex[  String( indx ) ]  = [ mkName, latlon[ i ], 0];
		markN++;
	}
	MarkerLine = L.polyline(latlon, { color: 'blue', weight: 5, bubblingMouseEvents: false }).on('click', LineClick).addTo(mymap);
	EditRtTr[ routeId ] = [ trckNumber, MBindex ];
}

// ウェイポイント編集ライン選択後のマーカー設置【wptEdit】
function place_wptMark( routeId ){
	if (Header[ routeId ][1] === "" ){ return; }
	MarkerLine = ChoseRoute[ routeId ]; // modeChange()でのエラー防止
	let wptArr = Header[ routeId ][1].split("</wpt>");
	if ( wptArr.length === 0 ){ return; }
	markN = 0;
	for ( let i = 0; i < wptArr.length; i++ ){
		let mkName = "m" + markN;
		let PT = wptArr[ i ].indexOf(  'lat="' );
		if ( PT != -1 ){
			let Wname = "", Wcmt = "", Wdesc = "";
			let lat = wptArr[ i ].substring( PT + 5, wptArr[ i ].indexOf( '"', PT +7 ) );
			PT = wptArr[ i ].indexOf(  'lon="' );
			let lon = wptArr[ i ].substring( PT + 5, wptArr[ i ].indexOf( '"', PT +7 ) );
			let PointMark = L.marker([ lat, lon ], {title:mkName }).on('click', MarkerClick).on('contextmenu', MarkerClickRt).addTo(mymap);
			LmarkerList[mkName] =  PointMark;
			Wname = wptArr[ i ].substring( wptArr[ i ].indexOf( '<name>' ) + 6, wptArr[ i ].indexOf( '</name>' ) );
			if ( wptArr[ i ].indexOf( '<cmt>' ) != -1 ){ Wcmt = wptArr[ i ].substring( wptArr[ i ].indexOf( '<cmt>' ) + 5, wptArr[ i ].indexOf( '</cmt>' ) ); }
			if ( wptArr[ i ].indexOf( '<desc>' ) != -1 ){ Wdesc = wptArr[ i ].substring( wptArr[ i ].indexOf( '<desc>' ) + 6, wptArr[ i ].indexOf( '</desc>' ) ); }
			LmarkerIndex[ String( i + 1) ] = [ mkName, lat, lon, Wname, Wcmt, Wdesc ]
			markN++;
		}
	}
}

// クリックしたwptマーカーの情報を編集欄に表示【wptEdit】
function disp_wptInfor(e){
	let clickMark = e.target.options.title
	for ( let index in LmarkerIndex ){
		if ( LmarkerIndex[ index ][0] === clickMark ){
			document.getElementById("trk1").value = LmarkerIndex[ index ][3];
			document.getElementById("trk2").value = LmarkerIndex[ index ][4];
			document.getElementById("trk3").value = LmarkerIndex[ index ][5];
			WptMark = index;
			break;
		}
	}
}

// wptマーカー追加【wptEdit】
function add_wptMark( lat, lon ){
	let mkName = "m" + markN;
	let PointMark = L.marker([ lat, lon ], {title:mkName }).on('click', MarkerClick).on('contextmenu', MarkerClickRt).addTo(mymap);
	LmarkerList[mkName] =  PointMark;
	LmarkerIndex[ String( Object.keys(LmarkerIndex).length + 1 ) ] = [ mkName, lat, lon, "ウェイポイント", "", "" ];
	WptMark = String( Object.keys(LmarkerIndex).length );
	document.getElementById("trk1").value = "ウェイポイント";
	markN++;
	replace_wptTxt()
} 

// マーカー追加&削除時のwptテキスト書換【wptEdit】
function replace_wptTxt(){
	let wptTxt = "";
	for ( let mk in LmarkerIndex){
		wptTxt += `<wpt lat="${LmarkerIndex[mk][1]}" lon="${LmarkerIndex[mk][2]}">\n<name>${LmarkerIndex[mk][3]}</name>\n<cmt>${LmarkerIndex[mk][4]}</cmt>\n<desc>${LmarkerIndex[mk][5]}</desc>\n</wpt>\n`;
	}
	RouteList[ActRoute][2] = Object.keys( LmarkerIndex ).length;
	Header[ActRoute][1] = wptTxt;
	WrtMessage1( `選択ルート：${RouteList[ActRoute][0]}、 ウェイポイント数：${RouteList[ActRoute][2]}` );
}

// 	"Pinfo" 用 総距離,累積標高値の表示作成 V2.2
function accu_ele(routeId){
	if ( trksegEleChk( routeId )[0] != 1 ){
		let trkTxt = "";
		for ( let i = 0; i < TrksegTxt[ routeId ].length; i++ ){ trkTxt += TrksegTxt[ routeId ][ i ]; }
		let laloArr = make_LatlonFmTrkTxt( trkTxt ), TotalDist = 0;
		for ( let i = 0; i < laloArr.length-1; i++ ){
			TotalDist += hubeny( laloArr[i][0], laloArr[i][1], laloArr[i+1][0], laloArr[i+1][1] );
		}
		TotalDist = Math.round( TotalDist / 10 ) / 100;
		let eleArr = make_EleFmTrkTxt( trkTxt ), PosBalo = 0, NegBalo = 0, PTele = eleArr[0];
		for ( let i = 1; i < eleArr.length; i++ ){
			let Balo = eleArr[ i ] - PTele;
			( Balo > 0 ) ? 	PosBalo += Balo: NegBalo += Balo;
			PTele = eleArr[ i ];
		}
		PosBalo = Math.round( PosBalo * 10 ) / 10; NegBalo = Math.round( Math.abs(NegBalo) * 10 ) / 10; 
		return `総距離:<b>${TotalDist}</b>Km　累積標高:<b>＋${PosBalo}</b>m,<b>－${NegBalo}</b>m`;
	}
}

// ---------- 選択ルート編集画面への情報表示 ----------
function dsp_routeInfo( routeId, trckNumber, NpInfo ){
	let PT = 0, TrackTxt = "", AddTxt = "";
	switch (mode){
		case "divide":
			if ( Object.keys(DevideMark).length === 0 ){ AddTxt = `<br>(ルートの分割したいポイントをクリック)`;}	
			WrtMessage1( `編集ルート：<b>${RouteList[routeId][0]}</b>` + AddTxt );
			document.getElementById("trk1").value = `${RouteList[routeId][0]}-1`;
			document.getElementById("trk2").value = `${RouteList[routeId][0]}-2`;
			break;
		case "remove":
			if ( Object.keys(DevideMark).length === 0 ){ AddTxt = `<br>マーカー未設定(ルートをクリックしてマーカー設置)`;}	
			WrtMessage1( `編集ルート：<b>${RouteList[routeId][0]}</b>` + AddTxt );
			break;
		case "Pinfo":  // V2.1 時間/標高は入力欄に表示、日付のみルート情報に表示するよう変更
			if ( typeof trckNumber === "undefined" ){ 
				WrtMessage1( `(ルートの情報表示したいポイントをクリック)` );
				return; 
			}
			let lat = NpInfo[0][0], lon = NpInfo[0][1];
			TrackTxt = TrksegTxt[routeId][ trckNumber -1 ];
			PT = 0, idx = -1, tesP ={};
			while( idx != NpInfo[2] ){
				tesP = get_trkptDat(TrackTxt, PT);
				idx++;
				PT = tesP[0] +1;
			}
			let ele = "";
			if ( tesP[5].indexOf("<ele>") != -1 ) { ele = tesP[5].substring( tesP[5].indexOf("<ele>") +5,  tesP[5].indexOf("</ele>") ); } 
			let Ptime = tesP[4], PtimeStr = "", PtimeStrD;
			if ( Ptime != ""){
				let PtimeObj = new Date( Ptime );
				PtimeStr =  PtimeObj.toLocaleString(); PtimeStrD = PtimeStr.split(" ")[0];
				PtimeStr =  PtimeStr.split(" ")[1];
				PtimeStrSpl = PtimeStr.split(":");
				if (PtimeStrSpl[0].length === 1){ PtimeStrSpl[0] = "0" + PtimeStrSpl[0]; }
				PtimeStr =  PtimeStrSpl[0] + ":" + PtimeStrSpl[1] + ":" + PtimeStrSpl[2];
				document.getElementById("ChgTime").value = PtimeStr;
			}else{
				document.getElementById("ChgTime").value = "";
			}
 			( Number.isNaN(ele) ) ? eleTxt = "": eleTxt = String( ele );
			document.getElementById("ChgEle").value = eleTxt;
			let trkNN = Track[routeId][trckNumber -1 ], NN1 = "", NN2 = "";
			( trkNN.indexOf("<name>") != -1 ) ?  NN1 = trkNN.substring( trkNN.indexOf("<name>") + 6, trkNN.indexOf("</name>") ): NN1 = "";
			( trkNN.indexOf("<number>") != -1 ) ?  NN2 = trkNN.substring( trkNN.indexOf("<number>") + 8, trkNN.indexOf("</number>") ): NN2 = "";
			WrtMessage1( `ルート名: <b>${RouteList[routeId][0]}</b>　トラック名,number: <b>${NN1}</b>,<b>${NN2}</b>` );
			WrtMessage2( `日付: <b>${PtimeStrD}</b>　${accu_ele(routeId)}<br><font color="black">index: [<b>${NpInfo[2]}</b>]　緯度経度: <b>${lat}</b>,<b>${lon}</b></font>` );
			break;
		case "edit":
			if ( typeof trckNumber != "undefined" ){
				let NumOfTrackPoit = strCount(TrksegTxt[ActRoute][ trckNumber -1 ], "</trkpt>");
				WrtMessage1( `編集ルート：<b>${RouteList[ActRoute][0]}</b>、選択トラック：<b>${Track[ActRoute][trckNumber -1 ]}</b>、ポイント数：<b>${NumOfTrackPoit}</b>` );
			}else{
				WrtMessage1( `編集ルート：<b>${RouteList[ActRoute][0]}</b><br>(ルートの編集する部分をクリック)` );
			}
			break;
		case "merge":
			let CR = Object.keys(ChoseRoute), CRnumb = CR.length;
			if ( CRnumb === 0 ){ 
				WrtMessage1( `<b>(ルートをクリックして結合するルートを選択)</b>` );
				document.getElementById("trk1").value = ""; 
			}else{
				if (CRnumb === 1 ){
					WrtMessage1( `選択ルート1：<b>${RouteList[CR[0]][0]}</b>` );
					document.getElementById("trk1").value = RouteList[CR[0]][0];
				}else{
					WrtMessage1( `選択ルート1：<b>${RouteList[CR[0]][0]}</b><br>選択ルート2：<b>${RouteList[CR[1]][0]}</b>` );
					document.getElementById("trk1").value = RouteList[CR[0]][0] + "-" + RouteList[CR[1]][0];
				}
			}
			break;
		case "decimate":
			let NumOfTotalPoit = 0;
			for ( let i = 0; i < RouteList[routeId][1]; i++ ){ NumOfTotalPoit += strCount(TrksegTxt[routeId][ i ], "</trkpt>"); }
			WrtMessage1( `編集ルート：<b>${RouteList[routeId][0]}</b>、ポイント数：<b>${NumOfTotalPoit}</b>` );
			break;
		case "TmChang":
			TrackTxt = TrksegTxt[routeId][ 0 ];
			let StartTime = get_trkptDat(TrackTxt, 0)[4];
			TrackTxt = TrksegTxt[routeId][ RouteList[routeId][1] -1 ];
			PT = TrackTxt.lastIndexOf("<trkpt");
			let EndTime = get_trkptDat(TrackTxt, PT)[4];
			let strDate, DayStr, stTimStr, edDate, DayEnd, edTimStr;
			if ( StartTime != "" ){
				let stTimObj = new Date( StartTime );
				strDate =  stTimObj.toLocaleString().split(' ');
				DayStr = strDate[0];
				stTimStr = strDate[1];
			}else{
				DayStr = "";
				stTimStr = "No Time Data";
			}
			if ( EndTime != "" ){
				let edTimObj = new Date( EndTime );
				edDate =  edTimObj.toLocaleString().split(' ');
				DayEnd = edDate[0];
				edTimStr = edDate[1];
			}else{
				edDate = "";
				DayEnd = "";
				edTimStr = "No Time Data"
			}
				WrtMessage1( ` 編集ルート：<b>${RouteList[routeId][0]}</b>` )
				WrtMessage2( ` 開始時間：<b>${DayStr} ${stTimStr}</b> ～ 終了時間：<b>${DayEnd} ${edTimStr}</b>` );
			break;
		case "reverse":
			WrtMessage1( `編集ルート：<b>${RouteList[routeId][0]}</b>` );
			document.getElementById("trk1").value = RouteList[routeId][0] + "_Rev";
			break;
		case "NaChang":
			let TrackNamesTxt = "";
			let dispTrack = [], N1, N2;
			for ( let i = 0; i < Track[routeId].length; i++ ){
				N1 = "<name>"; N2 = "<number>";
				if (  Track[routeId][i].indexOf("<name>") != -1 ){ // track名の変換
					N1 += Track[routeId][i].substring( Track[routeId][i].indexOf("<name>") + 6, Track[routeId][i].indexOf("</name>") );
				}
				if (  Track[routeId][i].indexOf("<number>") != -1 ){
					N2 += Track[routeId][i].substring( Track[routeId][i].indexOf("<number>") + 8, Track[routeId][i].indexOf("</number>") );
				}
				dispTrack.push( N1 + N2 );
			}
			for ( let i = 0; i < RouteList[routeId][1]; i++ ){ TrackNamesTxt += dispTrack[i] + "\n"; }
			document.getElementById("trk1").value = RouteList[routeId][0];
			document.getElementById("trk2").value = TrackNamesTxt; 
			WrtMessage1( `編集ルート：<b>${RouteList[routeId][0]}</b>、 トラック数：<b>${RouteList[routeId][1]}</b>` );
			break;
		case "save":
			WrtMessage1( `出力ルート：<b>${RouteList[routeId][0]}</b>` );
			document.getElementById("trk1").value = `${RouteList[routeId][0]}_ed`;
			break;
		case "EleRepl":
			WrtMessage1( `編集ルート：<b>${RouteList[routeId][0]}</b>` );
			break;
		case "wptEdit":
			WrtMessage1( `編集ルート：<b>${RouteList[routeId][0]}</b>、ウェイポイント数：<b>${RouteList[routeId][2]}</b>` );
		break;
	}
}
