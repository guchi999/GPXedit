// ///////////////////////// 実行 //////////////////////// 
// "jump" 地図ジャンプMath.
function junp_select(){
	let placeN = Number(Bttn1Value());
	let SVconst = jumpList[ placeN ].split("/");
	mymap.setView([SVconst[2], SVconst[3]], SVconst[1] );
	mode_sel( "make" );
}

// リストのダブルクリックでのジャンプ
function listJump(){
	let keyword = "", latlonAll = [];
	keyword = String(getSelection()).replace(/{.*}/,'');
	if ((!keyword) || (keyword === " ") || (keyword === ".") || (keyword === "\n") ){ return; }
	for ( let routeId in RouteList ){
		let ruteName = RouteList[ routeId ][0];
		if ( ruteName.indexOf( keyword ) != -1 ){
			for ( let i =0; i <  RouteList[ routeId ][1]; i++ ){
				let TrkLatLon = make_LatlonFmTrkTxt( TrksegTxt[ routeId ][ i ] );
				latlonAll = latlonAll.concat( TrkLatLon );
				TrkLatLon = [];
			}
			break;
		}
	}
	mymap.fitBounds( latlonAll );
	latlonAll = [];
}


// ルート削除
function delete_route( routeId ){
	del_routeLine( routeId );
	delete RouteList[routeId];
	delete Track[routeId];
	delete TrksegTxt[routeId];
	delete Header[routeId];
	ActRoute = ""; // V2.2
	dsp_routeList();
}


// "save" ファイル出力
function savelog(){
	let routeId = ActRoute, formSel = Bttn1Value();// V2.2
	writeFilNam = GetDoc("trk1");
// kml 出力モード選択を追加する場所
	( formSel === "0" || formSel === "2" ) ?  // gpx出力作成
		writeTex = make_GPXtxt(routeId, formSel ):
		writeTex = make_GPXtxtSimple(routeId, formSel);
	let title = writeFilNam + ".gpx"; // 出力ファイル名
	let linkTag = document.getElementById( "saveLocal" );
	let linkTagAttr = ["href","download"];
	let stringObject = new Blob( [writeTex], { type: "text/plain" } );
	let objectURL = window.URL.createObjectURL( stringObject );   
	linkTag.setAttribute( linkTagAttr[0], objectURL );
	linkTag.setAttribute( linkTagAttr[1], title ); 
//	document.getElementById("trk1").value ="" ;
	dsp_routeInfo( routeId );
	modeChange();
}

// 元ファイル形式gpx txt作成
function make_GPXtxt( routeId, formSel = "0" ){
	let WriteTxt = Header[routeId][0];
	if ( formSel === "0" ){ WriteTxt += Header[routeId][1]; }
	for (let i = 0; i < RouteList[routeId][1]; i++ ){ 
		WriteTxt += Track[routeId][ i ] + TrksegTxt[routeId][ i ]+ Header[routeId][2];
	}
	WriteTxt += Header[routeId][3];
	return WriteTxt;
}
// 最小サイズgpx txt作成
function make_GPXtxtSimple( routeId, formSel = "1" ){
	let WriteTxt = Header[routeId][0];
	if ( formSel === "1" ){ WriteTxt += Header[routeId][1]; }
	for (let i = 0; i < RouteList[routeId][1]; i++ ){ 
		WriteTxt += Track[routeId][ i ] + rmvAddInfo( TrksegTxt[routeId][ i ] ) + Header[routeId][2];
	}
	WriteTxt += Header[routeId][3];
	return WriteTxt;
}
// 最小サイズ用trkseg txt作成
function rmvAddInfo( trkseg ){
	let PT = 0, trkpt = "", ele = "", time ="", trksegTmp = "";
	while( PT != -1 ){
		let trkpDat = get_trkptDat( trkseg, PT );
		ele = ""; time ="";
		PT =  trkpDat[0];
		if ( PT != -1 ){
			trkpt = trkpDat[5].substring( 0, trkpDat[5].indexOf( ">" ) + 1 );
			if ( trkpDat[5].indexOf( "<ele>" ) != -1 ){ ele = trkpDat[5].substring( trkpDat[5].indexOf( "<ele>" ),  trkpDat[5].indexOf( "</ele>" ) + 6 ); }
			if ( trkpDat[5].indexOf( "<time>" ) != -1 ){ time = trkpDat[5].substring( trkpDat[5].indexOf( "<time>" ),  trkpDat[5].indexOf( "</time>" ) + 7 ); }
			trksegTmp += trkpt + ele + time + trkpDat[5].substring( trkpDat[5].indexOf( "</trkpt>" ) );
			PT++;
		}
	}
	trkseg = trksegTmp;
	trksegTmp = "";
	return trkseg;
}

// "divide" ルート分割（前半：始点から分割点の前まで 後半：分割点を含み終点まで）
function divide_route(){
	if ( Object.keys(DevideMark).length === 0){ return; }
	let NewNam1 = GetDoc("trk1");
	if (  chkRoteName(NewNam1) ){ alert("前半ルートと同じ名前のルートがあります。\n名前を変更してください"); return; }
	let NewNam2 = GetDoc("trk2");
	if (  chkRoteName(NewNam2) ){ alert("後半ルートと同じ名前のルートがあります。\n名前を変更してください"); return; }
	let routeId = DevideMark["0"].route;
	let numbOfTrack = RouteList[ routeId ][1];
	let DevdTrack = DevideMark["0"].track - 1;
	let DevPtOfTrkpt = DevideMark["0"].indx ; 
	let trksegNew1 = [], trksegNew2 = [], trkNaNew1 = [],  trkNaNew2 = [];
	for ( let i = 0; i < numbOfTrack; i++ ){
		let trksegTxt = TrksegTxt[routeId][ i ];
		let trackNam = Track[ routeId ][ i ];
		if ( i < DevdTrack ){
			trksegNew1.push( trksegTxt );
			trkNaNew1.push( trackNam );
		}else if ( i === DevdTrack ){
			let DevTrkseg = spl_trkseg( trksegTxt, DevPtOfTrkpt );
			if ( DevTrkseg[0] != "" ) { trksegNew1.push( DevTrkseg[0] ); trkNaNew1.push( trackNam ); }
			if ( DevTrkseg[1] != "" ) { trksegNew2.push( DevTrkseg[1] ); trkNaNew2.push( trackNam ); }
			DevTrkseg = [];
		}else{
			trksegNew2.push( trksegTxt );
			trkNaNew2.push( trackNam );
		}
	}
	let routeTxt1 = Header[ routeId ][0] + extract_wpt( routeId, trksegNew1.join("") );
	for ( let i = 0; i < trksegNew1.length; i++ ){
		routeTxt1 += trkNaNew1[ i ] + trksegNew1[ i ]+ Header[routeId][2]; 
	}
	routeTxt1 += Header[routeId][3];
	let routeTxt2 = Header[ routeId ][0] + extract_wpt( routeId, trksegNew2.join("") );
	for ( let i = 0; i < trksegNew2.length; i++ ){
		routeTxt2 += trkNaNew2[ i ] + trksegNew2[ i ] + Header[routeId][2]; 
	}
	routeTxt2 += Header[routeId][3];
	delete_route( routeId );
	make_RouteList( routeTxt2, NewNam2, 1 );
	make_RouteList( routeTxt1, NewNam1, 1 );
	trksegNew1 = [], trksegNew2 = [], trkNaNew1 = [],  trkNaNew2 = [];
	modeChange();
}

// trkseg を DevPtOfTrkpt ( trkpt の数 ) で分割 (DevPtOfTrkptを含まない前半, 含む後半）
function spl_trkseg( trkseg, DevPtOfTrkpt ){
	let PT = 0, count = 0;
	while(count != DevPtOfTrkpt +1 ){
		PT = trkseg.indexOf("<trkpt", PT)
		if ( PT === -1 ){ break; }
		count++;
		PT++;
	}
	return [ trkseg.substring(0, PT-1 ), trkseg.substring(PT -1)];
}

// Header[ routeId ][1]からtrksegTxt にある wpt を抜き出す
function extract_wpt( routeId, trksegTxt ){
	let wptOrg = Header[ routeId ][1];
	if ( wptOrg === "" ){ return ""; }
	let wptOrAr = wptOrg.split("</wpt>"), wptNew = "";
	for ( let i = 0; i < wptOrAr.length; i++){
		wptOrAr[ i ]
		let Latpt = wptOrAr[ i ].indexOf("lat="); let Lonpt = wptOrAr[ i ].indexOf("lon=");
		let strLatWpt = wptOrAr[ i ].substring( Latpt+5, wptOrAr[ i ].indexOf('"', Latpt+5) );
		let strLonWpt = wptOrAr[ i ].substring( Lonpt+5, wptOrAr[ i ].indexOf('"', Lonpt+5) );
		let PT = 0;
		while( PT != -1 ){
			let trkpDat = get_trkptDat( trksegTxt, PT );
			PT =  trkpDat[0];
			if ( PT != -1 ){
				if ( String(trkpDat[1]) === strLatWpt && String(trkpDat[2]) === strLonWpt ){
					wptNew += wptOrAr[ i ].substring( wptOrAr[ i ].indexOf("<") ) + "</wpt>\n";
					break;
				}else{
					PT++;
				}
			}
		}
	}
	return wptNew;
}

// "remove" ルートの部分削除
function patial_remove(){
	let NofMark = Object.keys(DevideMark).length;
	if ( NofMark === 0){ return; }
	let rmvMode = Bttn1Value();
	if ( ( rmvMode === "1" || rmvMode === "2") && ( NofMark < 2 ) ){ return; }
	let routeId = DevideMark["0"].route;
	let Mark1 = "0", Mark2 = "1";
	if ( NofMark === 1 ){ Mark2 = "0"; }
	if  ( NofMark === 2 ){ // DevideMarkの始点に近い方をMark1、終点に近い方をMark2とする
		if ( DevideMark["0"].track > DevideMark["1"].track ){ Mark1 = "1"; Mark2 = "0"; }
		if ( ( DevideMark["0"].track === DevideMark["1"].track ) && ( DevideMark["0"].indx > DevideMark["1"].indx ) ){ Mark1 = "1"; Mark2 = "0"; }
	}
	let trksegNew = [], trkNaNew = [], CutRes = [], trksegPstCut = [], trkNaPstCut = [];
	trksegNew = TrksegTxt[ routeId ].slice();
	trkNaNew = Track[ routeId ].slice();
	let numbOfTrack = trkNaNew.length;
	if ( rmvMode === "0" || rmvMode === "2" ){
		CutRes = cut_pre( trksegNew, trkNaNew, numbOfTrack, Mark1 );
		trksegNew = CutRes.Trkseg.slice();
		trkNaNew = CutRes.Track.slice();
		// preCut後postCutの為のMark値調整
		numbOfTrack = trkNaNew.length;
		if ( DevideMark[ Mark1 ].track === DevideMark[ Mark2 ].track){
			DevideMark[ Mark2 ].indx = DevideMark[ Mark2 ].indx - DevideMark[ Mark1 ].indx;
		}
		DevideMark[ Mark2 ].track = DevideMark[ Mark2 ].track - RouteList[ routeId ][1] + trkNaNew.length; 
	}
	if ( rmvMode === "2" || rmvMode === "3" ){
		CutRes = cut_post( trksegNew, trkNaNew, numbOfTrack, Mark2 );
		trksegNew = CutRes.Trkseg.slice();
		trkNaNew = CutRes.Track.slice();
	}
	if ( rmvMode === "1" ){
		CutRes = cut_post( trksegNew, trkNaNew, numbOfTrack, Mark1 );
		let trksegPstCut = CutRes.Trkseg.slice();
		let trkNaPstCut = CutRes.Track.slice();
		CutRes = cut_pre( trksegNew, trkNaNew, numbOfTrack, Mark2 );
		trksegNew = []; trkNaNew = [];
		trksegPstCut[ trkNaPstCut.length -1 ] = trksegPstCut[ trkNaPstCut.length -1 ] + CutRes.Trkseg[0] ;
		CutRes.Trkseg.shift();
		CutRes.Track.shift();
		trksegNew = trksegPstCut.concat( CutRes.Trkseg );
		trkNaNew = trkNaPstCut.concat ( CutRes.Track );
	}
	let routeTxt = Header[ routeId ][0] + extract_wpt( routeId, trksegNew.join("") );
	for ( let i = 0; i < trksegNew.length; i++ ){
		routeTxt += trkNaNew[ i ] + trksegNew[ i ] + Header[routeId][2];
	}
	routeTxt += Header[routeId][3];
	let tmp = strCount(routeTxt, "</trkpt>");
	if ( strCount(routeTxt, "</trkpt>") < 2 ){ return;}
	let Name = RouteList[ routeId ][0]
	delete_route( routeId );
	make_RouteList( routeTxt, Name, 1 );
	trksegNew = []; trkNaNew = []; CutRes = []; trksegPstCut = []; trkNaPstCut = []; routeTxt = "";
	modeChange();
}

// 分割点の前まで trksegArr(TrksegTxT), trkNaArr(Track) をカットする
function cut_pre( trksegArr, trkNaArr, numbOfTrack, Mark ){
	let trkseg = [], track = [];
	for ( let i = 0; i < numbOfTrack; i++ ){
		trkTxt = trksegArr[ i ];
		trkNam = trkNaArr[ i ];
		if ( i === DevideMark[ Mark ].track -1 ){
			trkseg.push( spl_trkseg( trkTxt, DevideMark[ Mark ].indx )[1] );
			track.push ( trkNam );
		}else if (  i > DevideMark[ Mark ].track -1 ){
			trkseg.push( trkTxt );
			track.push ( trkNam );
		}
	}
	return { Trkseg:trkseg, Track:track };
}

// 分割点の後の trksegArr(TrksegTxT), trkNaArr(Track)  をカットする
function cut_post( trksegArr, trkNaArr, numbOfTrack, Mark ){
	let trkseg = [], track = [];
	for ( let i = 0; i < numbOfTrack; i++ ){
		trkTxt = trksegArr[ i ];
		trkNam = trkNaArr[ i ];
		if ( i === DevideMark[ Mark ].track -1 ){
			trkseg.push( spl_trkseg( trkTxt, DevideMark[ Mark ].indx )[0] );
			track.push ( trkNam );
		}else if (  i < DevideMark[ Mark ].track -1 ){
			trkseg.push( trkTxt );
			track.push ( trkNam );
		}
	}
	return { Trkseg:trkseg, Track:track };
}


// "reverse" 逆ルート変換
function make_reverseRoute(){
	let RevRName = GetDoc("trk1");
	if (  chkRoteName(RevRName) ){ alert("逆ルートと同じ名前のルートがあります。\n名前を変更してください"); return; }
	let routeId = ActRoute; // v2.2
	let TrackNew = [], TrksegNew = [], TrksegTxtRev = "", TrksegTxtFow = "";
	for ( let i = 0; i < RouteList[ routeId ][1]; i++ ){
		TrksegTxtFow = TrksegTxt[ routeId ][ i ];
		let Point = 0, TrksegTxtRev = "";
		while (Point != -1 ){ // 逆順trkpt作成ループ
			let trkpDat = get_trkptDat(TrksegTxtFow, Point), trkptLineNew = "";
			Point = trkpDat[0];
			if ( trkpDat[0] != -1 ){ 
				if (  trkpDat[5].indexOf("<time>") != -1 ){
					let trkptLinSpl = trkpDat[5].split("<time>");
					trkptLineNew = trkptLinSpl[0] + "<time></time>" + trkptLinSpl[1].split("</time>")[1];
				}else{
					trkptLineNew = trkpDat[5];
				}
				TrksegTxtRev = trkptLineNew + TrksegTxtRev;
				Point++;
			}
		}
		TrackNew.unshift( Track[ routeId ][ i ] );
		TrksegNew.unshift( TrksegTxtRev );
	}
	let routeTxt = Header[ routeId ][0] + Header[ routeId ][1];
	for ( let i = 0; i < TrksegNew.length; i++ ){
		routeTxt += TrackNew[ i ] + TrksegNew[ i ] + Header[routeId][2];
	}
	routeTxt += Header[routeId][3];
	delete_route( routeId );
	make_RouteList( routeTxt, RevRName, 1 );
	TrackNew = []; TrksegNew = []; TrksegTxtRev = ""; TrksegTxtFow = ""; routeTxt ="";
	modeChange();
	CompMsg();
}


// "Pinfo" Pinfoで示したtrkptポイント(1点)の時間と標高の変更  (V2.1 標高入力の追加、関数名変更)
function chg_pointTimeEle(){
	let routeId = DevideMark["0"].route, trackNum = DevideMark["0"].track -1, trkptIndex = DevideMark["0"].indx;
	let trksegTxt = TrksegTxt[ routeId ][ trackNum];
	let trksegTxtNew = spl_trkseg( trksegTxt, trkptIndex );
	let trkptTxt = trkptTxtNew = trksegTxtNew[1].substring( 0, trksegTxtNew[1].indexOf("</trkpt>") + 8 );
	let EleTxtNew = GetDoc("ChgEle"), TimeTxtNew = GetDoc("ChgTime"), TimeTxt, EleTxt;
	if ( EleTxtNew != "" ){
		if ( !isNaN(EleTxtNew) ){ // 数値以外の入力をisNaNでチェック
			let EleTxtRep = "<ele>" + EleTxtNew + "</ele>";
			if ( trkptTxt.indexOf("<ele>") != -1 ){
				EleTxt = trkptTxt.substring( trkptTxt.indexOf("<ele>"),  trkptTxt.indexOf("</ele>") + 6 );
				if ( EleTxt != EleTxtRep ) trkptTxtNew = trkptTxt.replace( EleTxt, EleTxtRep );
			}else{
				let sep = trkptTxt.indexOf(">");
				trkptTxtNew = trkptTxt.substring( 0, sep + 1 ) + EleTxtRep + trkptTxt.substring( sep + 1 );
			}
		}else{
			document.getElementById("ChgEle").select();
			return;
		}
	}else{
		if ( trkptTxt.indexOf("<ele>") != -1 ){
			EleTxt = trkptTxt.substring( trkptTxt.indexOf("<ele>") +5,  trkptTxt.indexOf("</ele>") );
			trkptTxtNew = trkptTxt.replace( EleTxt, EleTxtNew );
		}
	}
	let noTimeFlg = 0;
	if ( TimeTxtNew != "" ){
		if ( trkptTxtNew.indexOf("<time>") != -1 ){
			TimeTxt = trkptTxtNew.substring( trkptTxtNew.indexOf("<time>") +6,  trkptTxtNew.indexOf("</time>") );
			if ( TimeTxt !="" ){
				let dateTxt = new Date( TimeTxt ).toLocaleDateString();
				let TvalTxt = new Date( TimeTxt ).toLocaleTimeString()  
				if ( TimeTxtNew[0] === "0" ){ TimeTxtNew = TimeTxtNew.slice(1); }
				if ( TimeTxtNew != TvalTxt ){
					let repTimeTxt =new Date( dateTxt + " " + TimeTxtNew ).toISOString();
					if ( TimeTxt.indexOf( "." ) === -1 ){ repTimeTxt = repTimeTxt.split( "." )[0] + "Z"; }
					trkptTxtNew = trkptTxtNew.replace( TimeTxt, repTimeTxt );
				}
			}else{
				noTimeFlg = 1;
			}
		}else{
			noTimeFlg = 1;
		}
		if ( noTimeFlg != 0){
			alert( "ルートに日付と時間のデータがありません。\作業モード時間変更で設定してください。" );
			document.getElementById("ChgTime").value = "";
			document.getElementById("ChgEle").value = EleTxtNew;
			if ( trkptTxt != trkptTxtNew ) { TrksegTxt[ routeId ][ trackNum] = TrksegTxt[ routeId ][ trackNum].replace( trkptTxt, trkptTxtNew ); }
			return;
		}
	}
	if ( trkptTxt != trkptTxtNew ) { TrksegTxt[ routeId ][ trackNum] = TrksegTxt[ routeId ][ trackNum].replace( trkptTxt, trkptTxtNew ); }
	if (EleGraph.OnOff == 1){eleGraphDrw();} // V2.3
	return;
}


// "NaChang" ルート、トラック名変更
function change_RTname(){
	let routeId = ActRoute; // V2.2
	let NewRouteName = GetDoc("trk1");
	let errFlg = 0;  // 同名ルートのチェック
	for ( let key in RouteList){
		if ( key != routeId  && RouteList[ key ][0] === NewRouteName  ){ errFlg = 1; } 
	}
	if ( errFlg != 0 ){ alert( "変更する名前と同名のルートがあります。\n別の名前にしてください。"); return; }
	let TracksTxt = GetDoc("trk2");
	let trakNameArr = TracksTxt.split("\n");
	errFlg = 0; // トラック名書式のチェック
	for ( let i = 0; i < trakNameArr.length -1 ; i++ ){
		if ( trakNameArr[ i ].indexOf("<name>") === -1 || trakNameArr[ i ].indexOf("<number>") === -1 ){ errFlg = 1; }
	}
	if ( trakNameArr.length -1 != RouteList[ routeId ][1] ){ errFlg = 1; }
	if ( errFlg != 0){
		alert( 'トラック名は "<name>名前<number>番号" の書式で、\nトラック数と同じ行数で記述してください。\n(名前、番号を付けない時は"<name><number>" )' );
		return;
	}
	for ( let i = 0; i < RouteList[ routeId ][1]; i++ ){
		let Name, Number,  repTxt, trkStr = Track[ routeId ][ i ];;
		Name = trakNameArr[ i ].split( "<number>" )[0];
		Number = "<number>" + trakNameArr[ i ].split( "<number>" )[1];
		if ( trkStr.indexOf( "<name>" ) != -1 ){
			repTxt = trkStr.substring( trkStr.indexOf( "<name>" ), trkStr.indexOf( "</name>" ) );
			Track[ routeId ][ i ] = Track[ routeId ][ i ].replace ( repTxt, Name );
		}
		if ( trkStr.indexOf( "<number>" ) != -1 ){
			repTxt = trkStr.substring( trkStr.indexOf( "<number>" ), trkStr.indexOf( "</number>" ) );
			Track[ routeId ][ i ] = Track[ routeId ][ i ].replace ( repTxt, Number );
		}
		if (  ( trkStr.indexOf( "<name>" ) === -1 ) && ( trkStr.indexOf( "<number>" ) === -1 ) ){
			Track[ routeId ][ i ] = Name + "</name>" + Number + "</number>" + Track[ routeId ][ i ];
		}
	}
	RouteList[ routeId ][0] = NewRouteName;	
	dsp_routeInfo( routeId );
	modeChange();
	CompMsg();
}


// "decimate" 間引き
function exec_decimate(){
	let routeId = ActRoute;  // V2.2
	let wptArr = make_wptArr( routeId );   // wpt削除回避の為にチェック用配列作成
	let interval = Number( GetDoc("interval") ); // 間引き間隔(m)
	for ( let i = 0; i < RouteList[ routeId ][1]; i++ ){ // 間引きループ(トラック毎）
		let trksegOrg = TrksegTxt[ routeId ][ i ], Point = 0; trksegNew = "", PtDis = 0, trkptPre = "";
		let lat1 = 0, lon1 = 0,  lat2 = 0, lon2 = 0;
		while( Point != -1){
			let trkpt = get_trkptDat( trksegOrg, Point )
			Point = trkpt[0];
			if ( Point != -1 ){
				lat2 = trkpt[1];  lon2 =  trkpt[2];
				PtDis += hubeny( lat1, lon1, lat2, lon2 );
				if ( PtDis > interval ){
					trksegNew += trkpt[5];
					PtDis = 0;
				}else{ // wpt削除回避
					for ( let i = 0; i < wptArr.length; i++ ){
						if ( lat2 == wptArr[ i ] [0] && lon2 == wptArr[ i ] [1] ){
							trksegNew += trkpt[5];
							PtDis = 0;
						}
					}
				}
				lat1 = lat2; lon1 = lon2;
				trkptPre = trkpt[5];
				Point++;
			}
		}
		trksegNew += trkptPre;
		TrksegTxt[ routeId ][ i ] = trksegNew;
	}
	let routeTxt = make_GPXtxt(routeId);
	let RouteNam = RouteList[ routeId ][0];
	delete_route( routeId );
	ActRoute  = make_RouteList( routeTxt, RouteNam, 1 ); // V2.2
	routeTxt ="";
	dsp_routeInfo( ActRoute );
	CompMsg();
}


// RouteList[ routeName ]の全トラックを統合
function unify_track( routeId ){
	let Trk = Track[ routeId ][ 0 ];
	let Seg = TrksegTxt[ routeId ].join("");
	return [ Trk, Seg ];
}


// "merge" ルート、トラックの結合
function exec_merge(){
	let SelRtId = Object.keys(ChoseRoute);
	if ( SelRtId.length === 0 ){ return; }
	let errTxt = "";
	for ( let i = 0; i < SelRtId.length; i++ ){ 
		let TC = trksegTimeChk( SelRtId[ i ] )
		if ( TC[0] != 0 ){ errTxt += RouteList[ SelRtId[ i ] ][0] + " "; } 
	}
	if ( errTxt != "" && ( Bttn1Value() === "0" || Bttn1Value() === "1" ) ){
		alert(`選択ルート [${errTxt}] の全部または一部に時間データがありません。\n作業選択の [時間変更] で時間を設定してください。`);
		return;
	}
	let routeId1 = SelRtId[0], routeId2 = "", routeTxt = "";
	 if ( SelRtId.length === 1 ){ // トラックの統合(１ルート)
		if ( Bttn1Value() === "0" ){
			Rt1 = unify_track( routeId1 );
			routeTxt = Header[ routeId1 ][0] + Header[ routeId1 ][1] + Rt1[0] + Rt1[1] + Header[routeId1][2] + Header[routeId1][3];
			let routeName = RouteList[ routeId1 ][0];
			delete_route( routeId1 );
			make_RouteList( routeTxt, GetDoc("trk1"), 1 );
		}
		return;
	}
	routeId2 = SelRtId[1]; 
	let wptArr1 = make_wptArr( routeId1 ), wptArr2 = make_wptArr( routeId2 ), wptArrM = wptArr1.slice(), wptTxt = "";
	for ( let i = 0; i < wptArr2.length; i++ ){
		let flg = 0 , latlonTxt = String( wptArr2 [ i ][0] ) + String( wptArr2 [ i ][1] );
		for ( let j = 0; j < wptArr1.length; j++ ){
			if (  latlonTxt === String(wptArr1 [ j ][0] ) + String( wptArr1 [ j ][1] ) ){ flg = 1; break; }
		}
		if ( flg === 0 ){ wptArrM.push( wptArr2[ i ].slice() ); }
	}
	wptArr1 = []; wptArr2 = [];
	for ( let i = 0; i < wptArrM.length; i++){
		wptTxt += `<wpt lat="${wptArrM[ i ][0]}" lon="${wptArrM[ i ][1]}">\n<name>${wptArrM[ i ][2]}</name>\n<cmt>${wptArrM[ i ][3]}</cmt>\n<desc>${wptArrM[ i ][4]}</desc>\n</wpt>\n`;
	}
	
	let trkSegArr = [], trackNamArr = [];
	let routeId = SelRtId[ Number( Bttn2Value() ) ];
	if ( Bttn1Value() === "0" ){ // トラックを統合して結合
		let Rt1 = unify_track( routeId1 ), Rt2 = unify_track( routeId2 );
		( Bttn2Value() === "0" ) ? 
			routeTxt += Header[ routeId1 ][0] + wptTxt + Rt1[0]:
			routeTxt += Header[ routeId2 ][0] + wptTxt + Rt2[0];
		let PT1 = 0, PT2 = 0, trkpt1, trkpt2;
		while( PT1 != -1 && PT2 != -1){ // trksegTxt の統合
			trkpt1 =  get_trkptDat( Rt1[1], PT1 );	PT1 = trkpt1[0];
			trkpt2 =  get_trkptDat( Rt2[1], PT2 );	PT2 = trkpt2[0];
			let Rt1Obj = new Date( trkpt1[4] ), Rt2Obj = new Date( trkpt2[4] );
			if ( PT1 != -1 && PT2 != -1 ){
		 		if ( Rt1Obj.getTime() >= Rt2Obj.getTime() ){
					routeTxt += trkpt2[5];	PT2++;
				}else{
					routeTxt += trkpt1[5];	PT1++; 
				}
			}
		}
		if ( PT1 != -1 ){ routeTxt += Rt1[1].substring( PT1 ) + Header[routeId][2]; }
		if ( PT2 != -1 ){ routeTxt += Rt2[1].substring( PT2 ) + Header[routeId][2]; }
	}else if ( Bttn1Value() === "1" ){ // トラックを時系列で結合
		let TrID1 = 0, TrID2 = 0, trkpt1, trkpt2;
		while( TrID1 < RouteList[ routeId1 ][1] && TrID2 < RouteList[ routeId2 ][1]){ 
			trkpt1 =  get_trkptDat( TrksegTxt[routeId1][TrID1], 0 );
			trkpt2 =  get_trkptDat( TrksegTxt[routeId2][TrID2], 0 );
			let Rt1Obj = new Date( trkpt1[4] ), Rt2Obj = new Date( trkpt2[4] );
			if ( Rt1Obj.getTime() >= Rt2Obj.getTime() ){
				trkSegArr.push( TrksegTxt[routeId2][TrID2] );	trackNamArr.push ( Track[ routeId2 ][ TrID2 ] );
				TrID2++;
			}else{
				trkSegArr.push( TrksegTxt[routeId1][TrID1] );	trackNamArr.push ( Track[ routeId1 ][ TrID1 ] );
				TrID1++;
			}
		}
		if ( TrID1 < RouteList[ routeId1 ][1] ){ 
			for ( let i = TrID1; i < RouteList[ routeId1 ][1] ; i++ ){
				trkSegArr.push( TrksegTxt[routeId1][ i ] );	trackNamArr.push ( Track[ routeId1 ][ i ] );
			}
		}
		if ( TrID2 < RouteList[ routeId2 ][1] ){
			for ( let i = TrID2; i < RouteList[ routeId2 ][1] ; i++ ){
				trkSegArr.push( TrksegTxt[routeId2][ i ] );	trackNamArr.push ( Track[ routeId2 ][ i ] );
			}
		}
		( Bttn2Value() === "0" ) ? 
			routeTxt += Header[ routeId1 ][0] + wptTxt:
			routeTxt += Header[ routeId2 ][0] + wptTxt;
		for ( let i = 0; i < trackNamArr.length; i++ ){
			routeTxt += trackNamArr[ i ] + trkSegArr[ i ] + Header[routeId][2];
		}
	}else if ( Bttn1Value() === "2" ){ // トラックの単純接続 
		for ( let i = 0; i < RouteList[ routeId1 ][1] ; i++ ){
			trkSegArr.push( TrksegTxt[routeId1][ i ] );	trackNamArr.push ( Track[ routeId1 ][ i ] );
		}
		for ( let i = 0; i < RouteList[ routeId2 ][1] ; i++ ){
			trkSegArr.push( TrksegTxt[routeId2][ i ] );	trackNamArr.push ( Track[ routeId2 ][ i ] );
		}
		( Bttn2Value() === "0" ) ?
			routeTxt += Header[ routeId1 ][0] + wptTxt:
			routeTxt += Header[ routeId2 ][0] + wptTxt;
		for ( let i = 0; i < trackNamArr.length; i++ ){
			routeTxt += trackNamArr[ i ] + trkSegArr[ i ] + Header[routeId][2];
		}
	}
	routeTxt += Header[routeId][3];
	delete_route( routeId1 );
	if ( routeId2 != ""){ delete_route( routeId2 ); }
	make_RouteList( routeTxt, GetDoc("trk1"), 1 );
	trkSegArr = [], trackNamArr = [], routeTxt = "";
	modeChange();
	dsp_routeList();
}


// lat, lon が eleTile にあるかをチェック、戻り 無:DL用[tileX, tileY] 有:[]
function chk_eleTile(lat, lon){
	let tileInfo = latLon2tile( lat, lon, 15 );
	let DEM5A = `${15}/${tileInfo[0]}/${tileInfo[1]}`;
	let DEM10B = `${14}/${Math.floor(tileInfo[0]/2)}/${Math.floor(tileInfo[1]/2)}`;
	if ( ( eleTile.hasOwnProperty(DEM5A) === false ) && ( eleTile.hasOwnProperty(DEM10B) === false ) ){ return [ tileInfo[0], tileInfo[1] ]; }
	return [];
}

// 緯度経度配列(LatLonArr)が eleTile に有るかをチェックし、無ければダウンロードタイルのリスト(DLtiles)作成
// 戻りは [ tileX, tileY ] の配列
function make_DLtiles( LatLonArr ){
	let DLtiles = [];
	for ( let i = 0; i < LatLonArr.length; i++ ){
		 let tileXY = chk_eleTile( LatLonArr[ i ][0], LatLonArr[ i ][1], 15 )
		if ( tileXY.length != 0 ){
			let exList = 0;
			for ( let j = 0; j < DLtiles.length; j++ ){
				if ( ( DLtiles[ j ][0] +"/"+ DLtiles[ j ][1] ) === ( tileXY[0] + "/" + tileXY[1] ) ){ exList = 1; break; }
			}
			if ( exList === 0 ){ DLtiles.push( [ tileXY[0], tileXY[1] ] ); }
		}
	}
	return DLtiles;
}

// "EleRepl" 標高置換
function ele_replace(){
	let routeId = ActRoute; // V2.2
	let latlonAll = []; // 選択ルートのlat lon により標高タイルDLリスト作成
	for ( let i = 0; i < RouteList[ routeId ][1]; i++ ){
		let latlonSeg = make_LatlonFmTrkTxt( TrksegTxt[ routeId ][ i ] );
		Array.prototype.push.apply(latlonAll, latlonSeg);
	}
	let DLtileList = make_DLtiles( latlonAll );
	(async function (){
		if ( DLtileList.length != 0 ){
			for ( let i = 0; i < DLtileList.length; i++ ){ 
				await get_tile( DLtileList[ i ][0], DLtileList[ i ][1] ); 
				WrtMessage1(`標高データ取得 ${Math.round( 100 * ( i + 1 )/DLtileList.length )}% `);
			}
		}
		eleTxt_change( routeId );
	}());
	CompMsg();
}
// trksegTxtの<ele>~</ele>をeleTileの値に置き換え (V2.1 標高代替値を追加)
function eleTxt_change( routeId ){
	for ( let i = 0; i < RouteList[ routeId ][1]; i++ ){
		let PT = 0, trkpt = [], segTxtNew = "";
		while ( PT != -1 ){
			trkpt =  get_trkptDat( TrksegTxt[routeId][ i ], PT );
			PT = trkpt[0];
			if (  PT != -1){ // ダウンロード済みタイルからlat, lon座標の標高値を得て<ele>～</ele>を書換
				let eleTxt = "<ele>" + String( get_Ele( trkpt[1], trkpt[2] ) ) + "</ele>"; 
				if ( eleTxt.indexOf( "NaN") != -1){ // V2.1
					( Bttn1Value() === "0" ) ? eleTxt = "<ele>" + GetDoc("repEle") + "</ele>":  eleTxt = "<ele></ele>";
				}
				( trkpt[5].indexOf("<ele>") != -1 ) ? 
					segTxtNew += trkpt[5].split("<ele>")[0] + eleTxt + trkpt[5].split("</ele>")[1]:
					segTxtNew += trkpt[5].substring( 0, trkpt[5].indexOf(">") + 1 ) + eleTxt + trkpt[5].substring( trkpt[5].indexOf(">") + 1 );
				PT++;
			 }
		}
		TrksegTxt[routeId][ i ] = segTxtNew;
		segTxtNew = "";
	}
	latlonAll = []; DLtileList = [];
	modeChange();
}


// "make" 作成ルート確定
function fix_make_route(){
	if ( Object.keys(LmarkerIndex).length === 0){ return; }
	let routeName = GetDoc("route1"), nameChk = 0;
	if ( chkRoteName( routeName ) ){ alert("同じ名前のルートがあります。名前を変更してください"); return; }
	let trackName  = GetDoc("track1");
	let theDate = GetDoc("SetTime-date");
	let startTime = GetDoc("SetTime-start");
	let endTime = GetDoc("SetTime-end");
	startTime = theDate + " " + startTime;  endTime =  theDate + " " + endTime;
	let endTimObj = new Date( endTime ); let startTimObj = new Date( startTime );
	let timChk = endTimObj.getTime() - startTimObj.getTime();
	if (( timChk <= 0) || isNaN(timChk)){ alert("正しい時間をセットしてください"); return; }
	let latlonArr = [], eleArr = [];
	for ( let i = 1; i < Object.keys(LmarkerIndex).length +1; i++){ // LatLon, eleの配列作成
		let latlon = LmarkerIndex[String(i)][1];
		latlonArr.push( latlon.slice() );
		eleArr.push ( get_Ele( latlon[0], latlon[1] ) );
	}
	let timeArr = make_timeArr( latlonArr, eleArr, startTime, endTime );
	let routeTxt = HeaderTxt + '<trk><name>' + trackName + '</name><number>1</number><trkseg>\n';
	for ( let i = 0; i < latlonArr.length; i++ ){
		routeTxt += '<trkpt lat="' + latlonArr[ i ][0] + '" lon="' + latlonArr[ i ][1] + '"><ele>' + eleArr[ i ] + '</ele><time>' + timeArr[ i ] + '</time></trkpt>\n';
	}
	routeTxt += '</trkseg>\n</trk>\n</gpx>\n';
	for ( let M in LmarkerList ){ mymap.removeLayer( LmarkerList[M] ); }  // makeルートのマーカーとラインを消去
	mymap.removeLayer(MarkerLine);
	LmarkerList = {}; latlonArr = []; eleArr = []; timeArr = [];
	make_RouteList( routeTxt, routeName, 1 );  // ルートの登録
	LmarkerIndex = {};	LmarkerList = {}; // V2.31
	modeChange();
	dsp_routeList();
}


// "TmChang" 時間変更 
function change_time(){
//	if ( Object.keys(ChoseRoute).length === 0){ return; }
	let TcDate = GetDoc("SetTime-date");
	let TcStartTime = GetDoc("SetTime-start");
	let TcEndTime = GetDoc("SetTime-end");
	let startTime = TcDate + " " + TcStartTime, endTime =  TcDate + " " + TcEndTime;
	let endTimObj = new Date( endTime ), startTimObj = new Date( startTime );
	if ( Bttn1Value() === "0" ){
		let timChk = endTimObj.getTime() - startTimObj.getTime();	
		if (( timChk <= 0) || isNaN(timChk)){ alert("正しい時間をセットしてください"); return; }	
	}else{
		if ( TcDate == ""  || TcStartTime == "" ){ alert("正しい時間をセットしてください"); return; }
	}
	let routeId = ActRoute; //V2.2
	if (Bttn1Value() === "0" ){ // 時間変更
		let EE = trksegEleChk( routeId );
		if ( EE[0] != 0 ){
			alert( `トラック [${Track[ routeId ][ EE[1] ]}] の全部または一部に標高データがなく時間変更が出来ません。\n作業選択の [標高置換] で標高を設定してください。` );
			return;
		}
		let TKseg = unify_track( routeId )[1];
		let timeArr = make_timeArr( make_LatlonFmTrkTxt( TKseg ), make_EleFmTrkTxt( TKseg ), startTime, endTime );
		TKseg = SegTimeTxt_change( TKseg, timeArr );
		for ( let i = 0; i < RouteList[ routeId ][1]; i++){
			let NumOfLine = strCount(TrksegTxt[ routeId ][ i ], "</trkpt>" );
			let SplTrkseg = spl_trkseg( TKseg, NumOfLine );
			TrksegTxt[ routeId ][ i ] = SplTrkseg[0];
			TKseg = SplTrkseg[1];
			if ( i === RouteList[ routeId ][1] -1 ){ TrksegTxt[ routeId ][ i ] = SplTrkseg[1]; }
		}
	}
	if (Bttn1Value() === "1" ){ // 時間シフト
		let EE = trksegTimeChk( routeId );
		if ( EE[0] != 0 ){
			alert( `トラック [${Track[ routeId ][ EE[1] ]}] の全部または一部に時間データが無くシフトが出来ません。\n 時間変更で設定してください。` );
			return;
		}
		let TKseg = unify_track( routeId )[1];
		TKseg = segTime_shuft( TKseg, startTime );
		for ( let i = 0; i < RouteList[ routeId ][1]; i++){
			let NumOfLine = strCount(TrksegTxt[ routeId ][ i ], "</trkpt>" );
			let SplTrkseg = spl_trkseg( TKseg, NumOfLine );
			TrksegTxt[ routeId ][ i ] = SplTrkseg[0];
			TKseg = SplTrkseg[1];
			if ( i === RouteList[ routeId ][1] -1 ){ TrksegTxt[ routeId ][ i ] = SplTrkseg[1]; }
		}
	}
	modeChange();
}

// trksegTxtの<time>～</time>をtimeArrの値に置き換え： 戻り trksegTxt
function SegTimeTxt_change( trksegTxt, timeArr ){
	let PT = 0, trkpt = [], segTxtNew = "";
	for ( let i = 0; i < timeArr.length; i ++ ){
		trkpt =  get_trkptDat( trksegTxt, PT );
		PT = trkpt[0];
		let timeTxt = "<time>" + timeArr[ i ] + "</time>"; 
		( trkpt[5].indexOf("<time>") != -1 ) ? 
			segTxtNew += trkpt[5].split("<time>")[0] + timeTxt + trkpt[5].split("</time>")[1]:
			segTxtNew += trkpt[5].substring( 0, trkpt[5].indexOf("</ele>") + 6 ) +timeTxt + trkpt[5].substring( trkpt[5].indexOf("</trkpt>") );
		PT++;
	}
	return segTxtNew;
}

// trksegTxtの<time>～</time>をstartTime分シフトして置き換える
function segTime_shuft( trksegTxt, startTime ){
	let timeArr = make_TimeFmTrkTxt( trksegTxt );
	TimeTrkTop = new Date( trksegTxt.substring( trksegTxt.indexOf( "<time>" ) + 6, trksegTxt.indexOf( "</time>" ) ) )
	TimeStart =  new Date( startTime );
	let deltaT = TimeTrkTop.getTime() - TimeStart.getTime();
	for (let i = 0; i < timeArr.length ; i++ ){
		let TimeTKseg = new Date( timeArr[ i ] );
		TimeTKseg.setTime(TimeTKseg.getTime() - deltaT );
		timeArr[ i ] = TimeTKseg.toISOString().split('.')[0] + "Z";
	}
	trksegTxt = SegTimeTxt_change( trksegTxt, timeArr );
	return trksegTxt;
}


// "edit" 部分編集確定
function fix_edit(){
	if ( Object.keys(EditRtTr).length === 0){ return; }
	const mov_mark = ( trkptStr, latlng ) =>{ // 移動したマーカーのtrkptTxt生成関数
		let tmpTxt =trkptStr.split( 'lat="'), trkptStrNew = "";
		trkptStr = tmpTxt[0] + 'lat="' + latlng[0] + tmpTxt[1].substring( tmpTxt[1].indexOf( '"' ) );
		tmpTxt = trkptStr.split( 'lon="');
		trkptStr = tmpTxt[0] + 'lon="' + latlng[1] + tmpTxt[1].substring( tmpTxt[1].indexOf( '"' ) );
		let eleTxt = "<ele>" + get_Ele( latlng[0], latlng[1] ) + "</ele>"; 
		( trkptStr.indexOf("<ele>") != -1 ) ? 
			trkptStrNew += trkptStr.split("<ele>")[0] + eleTxt + trkptStr.split("</ele>")[1]:
			trkptStrNew += trkptStr.substring( 0, trkptStr.indexOf(">") + 1 ) + eleTxt + trkptStr.substring( trkptStr.indexOf(">") + 1 );
		return trkptStrNew;
	}
	let routeId = Object.keys(EditRtTr)[0];
	let trkTxt = TrksegTxt[ routeId ][ EditRtTr[ routeId ][0] -1 ];
	let MBindex = EditRtTr[ routeId ][1];
	let sep = [];
	sep[0] = trkTxt.substring( trkTxt.indexOf(">") + 1, trkTxt.indexOf("<", trkTxt.indexOf(">") ) );
	sep[1] = trkTxt.substring( trkTxt.indexOf("</trkpt>") + 8, trkTxt.indexOf("<trkpt ",  trkTxt.indexOf("</trkpt>")) );
	let tmpTxt = spl_trkseg( trkTxt, MBindex );
	// trkTxtを pre(非変更), mid(変更), pst(非変更) の３つに分ける
	let preTxt = tmpTxt[0], midTxt = "", pstTxt = "";
	if ( strCount( tmpTxt[1], "</trkpt>") > 600 ){
		tmpTxt = spl_trkseg( tmpTxt[1], 601 ); 
		midTxt = tmpTxt[0]; pstTxt = tmpTxt[1];
	}else{
		midTxt = tmpTxt[1];
	}
	let PT = 0, chgTxt = "";
	let wptArr = make_wptArr( routeId );
 	// midTxtをLmarkerIndexに従って変更(trkptの追加/削除/移動) → chgTxt
	for ( let i = 0; i <  Object.keys(LmarkerIndex).length; i++ ){
		let ptOrg = get_trkptDat( midTxt, PT );
		let mrkInf = LmarkerIndex[ String( i + 1 ) ];
		PT = ptOrg[0]
		if ( mrkInf[2] === 3 ){ // 削除trkpt
			for ( let j = 0; j < wptArr.length; j++ ){ // 削除trkptがwptArrにあれば削除
				if ( ptOrg[1] +"-"+ ptOrg[2] === wptArr[ j ][0] +"-"+  wptArr[ j ][1] ){
					wptArr.splice( j, 1 ); break;
				}
			}
			PT++;
		}else if ( mrkInf[2] === 2 ){ // 追加trkpt
			chgTxt += `<trkpt lat="${ mrkInf[1][0] }" lon="${ mrkInf[1][1] }">${sep[0]}<ele>${ get_Ele( mrkInf[1][0], mrkInf[1][1] ) }</ele>${sep[0]}<time></time>${sep[0]}</trkpt>${sep[1]}`;
		}else if ( mrkInf[2] === 1 ){ // 移動trkpt
			for ( let j = 0; j < wptArr.length; j++ ){ // 移動trkptがwptArrにあればlat, lonを変更
				if ( ptOrg[1] +"-"+ ptOrg[2] === wptArr[ j ][0] +"-"+  wptArr[ j ][1] ){
					wptArr[ j ][0] = mrkInf[1][0]; wptArr[ j ][1] =mrkInf[1][1]; break;
				}
			}
			ptOrg[5] = mov_mark( ptOrg[5], mrkInf[1] ); 
			chgTxt += ptOrg[5];
			PT++;
		}else{
			chgTxt += ptOrg[5];
			PT++;
		}
	}
	PT = 0;
	let TcList = [], flg = 0, buff = "";
	// 時間設定必要なtrkptを含むの変更部分のリスト作成(TcList)
	while( PT != -1 ){ 
		let chkLin = get_trkptDat( chgTxt, PT );
		PT = chkLin[0]; 
		if ( PT != -1 ){
			if ( chkLin[5].indexOf( "<time></time>" ) != -1 ){
				buff += chkLin[5];
				flg = 1;
			}else{
				if ( flg != 0 ){ buff += chkLin[5];	TcList.push( buff ); }
				buff = chkLin[5];
				flg = 0;
			}
			PT++;
		}
	}
	// TcListに従って時間を設定した変更部分でchgTxtの当該する部分を置換
	if ( trksegTimeChk( routeId )[0] != 1 ){ // 時間データ無しは時間変更をスキップ V2.02
		for ( let i = 0; i < TcList.length; i++ ){ // V2.2:秒以下のデータがあるgpxでの不具合回避の為変更
	 		let startTime = TcList[ i ].substring( TcList[ i ].indexOf("<time>") + 6, TcList[ i ].indexOf("</time>") );
		 	let endTime = TcList[ i ].substring( TcList[ i ].lastIndexOf("<time>") + 6, TcList[ i ].lastIndexOf("</time>") );
			let timeArr = make_timeArr( make_LatlonFmTrkTxt( TcList[ i ] ), make_EleFmTrkTxt( TcList[ i ] ), startTime, endTime );
			let pstChg = SegTimeTxt_change( TcList[ i ], timeArr ); // 変更部分の時間設定
			let OrgTopLine =  TcList[ i ].substring( 0, TcList[ i ].indexOf( "<trkpt", 7 ) );
			let OrgEndLine =  TcList[ i ].substring( TcList[ i ].lastIndexOf("<trkpt") );
			let str1 = chgTxt.split(OrgTopLine)[0] + OrgTopLine;
			let str2 = pstChg.substring( pstChg.indexOf( "<trkpt", 7 ), pstChg.lastIndexOf( "<trkpt" ) );
			let str3 = OrgEndLine + chgTxt.split(OrgEndLine)[1];
			chgTxt = str1 + str2 + str3;
		}
	}
	TrksegTxt[ routeId ][ EditRtTr[ routeId ][0] -1 ] = preTxt + chgTxt + pstTxt;
	let wptTxt = ""; // ヘッダのwptを書き換え
	for ( let i = 0; i < wptArr.length; i++){
		wptTxt += `<wpt lat="${wptArr[ i ][0]}" lon="${wptArr[ i ][1]}">\n<name>${wptArr[ i ][2]}</name>\n<cmt>${wptArr[ i ][3]}</cmt>\n<desc>${wptArr[ i ][4]}</desc>\n</wpt>\n`;
	}
	Header[ routeId ][1] = wptTxt;
	let routeTxt = make_GPXtxt(routeId);
	let routeName = RouteList[ routeId ][0];
	delete_route( routeId );
	make_RouteList( routeTxt, routeName, 1 );
	tmpTxt = []; preTxt = midTxt = pstTxt = chgTxt = routeTxt = "";
	modeChange();
}


// wpt配列作成
function make_wptArr( routeId ){
	let wptArr = [];
	if ( Header[ routeId ][1] != "" ){
		let Tmp = Header[ routeId ][1].split("</wpt>");
		for ( let i = 0; i < Tmp.length; i++ ){
			let PT = Tmp[ i ].indexOf(  'lat="' );
			if ( PT != -1 ){
				let lat = Tmp[ i ].substring( PT + 5, Tmp[ i ].indexOf( '"', PT +7 ) );
				PT = Tmp[ i ].indexOf(  'lon="' );
				let lon = Tmp[ i ].substring( PT + 5, Tmp[ i ].indexOf( '"', PT +7 ) );
				let Wname = "", Wcmt = "", Wdesc = "";
				Wname = Tmp[ i ].substring( Tmp[ i ].indexOf( '<name>' ) + 6, Tmp[ i ].indexOf( '</name>' ) );
				if ( Tmp[ i ].indexOf( '<cmt>' ) != -1 ){ Wcmt = Tmp[ i ].substring( Tmp[ i ].indexOf( '<cmt>' ) + 5, Tmp[ i ].indexOf( '</cmt>' ) ); }
				if ( Tmp[ i ].indexOf( '<desc>' ) != -1 ){ Wdesc = Tmp[ i ].substring( Tmp[ i ].indexOf( '<desc>' ) + 6, Tmp[ i ].indexOf( '</desc>' ) ); }
				wptArr.push( [ lat, lon, Wname, Wcmt, Wdesc ] );
			}
		}
	}
	return wptArr;
}

// "wptEdit" 編集確定
function wpt_edit(){
	if ( WptMark === "" ){ return; }
	LmarkerIndex[ WptMark ][3] = GetDoc( "trk1" );
	LmarkerIndex[ WptMark ][4] = GetDoc( "trk2" );
	LmarkerIndex[ WptMark ][5] = GetDoc( "trk3" );
	replace_wptTxt();
	CompMsg();
}
