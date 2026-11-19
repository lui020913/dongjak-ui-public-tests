/** v8.5.4 — local, offline UI language preference.
 * Only authored interface labels are translated. Place names, addresses, user
 * content and source-provided map labels are intentionally left untouched.
 */
const STORAGE_KEY='dongjak_ui_language_v854';
const KO_TO_EN=Object.freeze({
"도보 길찾기":"Walking Directions","장소를 지정한 뒤 경로를 선택하면 GPS 이동 안내·경로 이탈 자동 재탐색·선택형 음성 안내를 이용할 수 있습니다.":"Set your places and choose a route to use GPS guidance, rerouting and optional voice directions.","출발지 검색":"Search Start","목적지 검색":"Search Destination","장소명 또는 주소를 입력하고 검색을 누르세요.":"Enter a place or address and press Search.","선택 장소 확인":"Confirm Selected Place","다른 결과":"Other Results","이 위치로 설정":"Use This Location","일반 보행 경로":"Standard Walking Route","동작구 내 서울시 도보 네트워크를 우선 사용합니다. 경사도는 지형 기반 추정이며 무계단·휠체어 통행 가능을 보장하지 않습니다. 범위 밖에서는 외부 경로 서버를 사용합니다.":"Uses the Seoul walking network in Dongjak-gu. Terrain-based slope estimates do not guarantee step-free or wheelchair access. Routes outside this area use an external server.","지도에서 경로 보기 →":"Show Route on Map →","GPS 안내 시작":"Start GPS Guidance","동작구 내에서는 서울시 도보 링크(2026-11-11 수집)로 경로를 계산합니다. 보행자 통행 허용 링크라도 차도와 혼용될 수 있으며 실제 보도·계단·공사 및 통행제한은 검증되지 않았습니다. 동작구 경계 밖, 단절 또는 데이터 오류 시에는 외부 시험용 경로 서버로 출발·도착 좌표를 전송합니다.":"Routes in Dongjak-gu use Seoul walking links collected on 2026-11-11. Pedestrian access may share the roadway; sidewalks, steps, construction and restrictions are unverified. Outside the district, or if local routing fails, start and destination coordinates are sent to an external trial routing server.","선택한 장소":"Selected Place","지도에서 표시된 마커 위치가 맞습니까?":"Is the marked location correct?","도보 경로 · 안전도 미평가":"Walking Route · Safety Not Rated","동작구 소식":"Dongjak News","소식을 조회하지 않았습니다.":"News has not been loaded.","동작구청 공식 공지사항 확인 ↗":"Official District Notices ↗","Google 뉴스에서 더 보기 ↗":"More on Google News ↗","현재 계정·서버 연결이 없으므로 다른 휴대전화나 팀원과 자동 공유되지 않습니다.":"Without an account connection, these records do not sync with other devices or teammates.","즐겨찾기 · 내 기록":"Favorites & Records","계정·즐겨찾기 기능은 기존 카카오·Supabase 연결을 그대로 사용합니다.":"Your existing Kakao and account connection manages favorites.","로그인 전에는 이 기기에 저장됩니다. 이메일 로그인 후에는 서버와 동기화할 수 있습니다.":"Saved on this device before sign-in. Sign in with email to sync with your account.","새 그룹 이름":"New Group Name","새 즐겨찾기 그룹 이름":"New Favorite Group Name","+ 그룹 만들기":"+ Create Group","기록 삭제":"Clear History","이름 변경":"Rename","그룹 삭제":"Delete Group","선택한 지도 위치":"Selected Map Location","확인된 역사 위치와 노선 순서를 기반으로 탐색합니다. 지하철 운행 시간·배차·실시간 환승 시간은 포함되지 않습니다. 버스 환승 경로는 데이터가 확보될 때까지 계산하지 않습니다.":"Uses verified station locations and line order. Subway service times, frequencies and live transfer times are excluded. Bus transfers are unavailable until data is confirmed.","음성 지원 여부와 사용 가능한 목소리는 기기에 따라 다릅니다. 실제 경로 계산·안내는 길찾기에서 시작합니다.":"Voice availability depends on your device. Start route calculation and guidance in Directions.","기존 지도 옵션과 동일한 설정이며 선택 상태는 자동으로 저장됩니다. 테마 및 화면 효과는 아래의 기존 설정에서도 변경할 수 있습니다.":"These controls share Map Options and save your choices automatically. You can change themes and effects below.",

"로그인 또는 회원가입":"Sign in or create an account","카카오 · 이메일 계정 관리":"Kakao · Email account","앱 & 화면":"App & Display","화면 테마":"Color Theme","라이트":"Light","지도 설정 · 범례 · 도보":"Map & Walking Settings","지도·도보 설정":"Map & Walking Settings","지도 도구":"Map Tools","안전 지도 도구":"Safety Map Tools","태블릿 지도 도구":"Tablet Map Tools","내 활동":"My Activity","우리 동네 이야기":"Neighborhood Stories","보행 불편":"Walking Issues","개선 제안":"Suggestions","동네 질문":"Questions","최신순":"Newest","인기순":"Popular","주변정보":"Nearby","행정동":"Neighborhoods","제보":"Report","지역 뉴스":"Local News","구청 소식":"District News","지도 범례":"Map Legend","도보 설정":"Walking Settings","음성 · 진행방향":"Voice · Orientation","지도 디자인 설정":"Map Design","테마 · 3D · 레이어":"Theme · 3D · Layers","이 기기에만 저장되는 화면 설정입니다.":"These display settings are saved on this device.","기본값 복원":"Reset Defaults","라이트·다크 테마를 변경합니다.":"Choose the light or dark theme.","다크 모드로 변경":"Switch to Dark","라이트 모드로 변경":"Switch to Light","테마 변경":"Change Theme","앱 처음부터 둘러보기":"Explore the App","설치 방법 보기":"Installation Guide","설치 방법 접기":"Hide Installation Guide","웹앱으로 더 편리하게":"Use as a Web App","나중에":"Later","홈 화면에 추가하면 주소창 없이 더 넓은 지도 화면으로 이용할 수 있습니다.":"Add to your home screen for a larger map without the address bar.","보행 중 불편했던 곳을 지도에 남기거나, 개선 아이디어를 기록할 수 있습니다.":"Mark walking issues on the map or share ideas for improvements.","게시글":"Posts","동네 커뮤니티":"Neighborhood Community","보행환경에 관한 이야기와 개선 의견을 이 브라우저에 기록합니다.":"Share walking experiences and improvement ideas in this browser.","+ 글쓰기":"+ New Post","아직 등록된 게시글이 없습니다. 보행 불편이나 개선 의견을 남겨 주세요.":"No posts yet. Share a walking issue or improvement idea.","지도에서 보행환경 제보하기":"Report a Walking Issue on the Map","선택되지 않음":"Not selected","출발지":"Start","목적지":"Destination","지도":"Map","⌖ 현재 위치를 출발지로 지정":"⌖ Use My Location as Start","도보 경로 찾기":"Find Walking Route","도보 + 지하철 이동안":"Walk + Subway","지하철 연계 이동안 찾기":"Find Walk + Subway Route","현재 장소·경유지 공유":"Share Places & Stops","경로 및 지정 위치 초기화":"Clear Route & Places","출발":"Start","도착":"Destination","출발대기":"Awaiting Departure","다시 선택":"Select Again","이 위치 확인":"Confirm Location","선택한 지도 위치":"Selected Map Location","장소 확인":"Confirm Place","지도에서 선택한 장소가 맞습니까?":"Is this the right location?","일반 보행":"Standard Walk","경사 회피 우선":"Avoid Slopes","경로 한눈에 비교":"Compare Routes","지도에서 보기":"Show on Map","GPS 안내":"GPS Guidance","변경":"Edit","종료":"End","교통정보":"Transit","버스정류장":"Bus Stop","지하철역":"Subway Station","시간표":"Timetable","실시간":"Live","조회":"Checked","주소":"Address","전화번호":"Phone","홈페이지":"Website","공식/등록 웹사이트 열기":"Open Website","즐겨찾기 설정":"Favorite Settings","저장 폴더":"Folder","AI 시설 안내":"AI Place Guide","AI 설명 다시 시도":"Retry AI Guide","네이버지도에서 시설 주소·연락처 검색":"Search Address & Contacts on Naver Map","켜짐":"On","꺼짐":"Off","음성 길안내":"Voice Guidance","진행방향 보기":"Follow Direction","안내 목소리":"Guidance Voice","기기 기본":"Device Default","여성":"Female","남성":"Male","전체 한국어 음성":"All Korean Voices","지도 위 온도 버튼을 표시합니다.":"Show the temperature button on the map.","도움말·나침반·홈·내 위치 버튼을 표시합니다.":"Show help, compass, home and location controls.","플로팅 창 등의 전환 애니메이션을 줄입니다.":"Reduce animations for floating windows.","지하철 노선 · 역":"Subway Lines & Stations","동작구 경계":"Dongjak Boundary","3D 건물":"3D Buildings","지도 확대 시 건물 높이를 표시합니다.":"Show building heights when zoomed in.","실제 GPS 길안내에서 사용합니다.":"Used during GPS guidance.","안내 중 지도 방향을 따라갑니다.":"Follow your direction during guidance.","기기에서 제공되는 한국어 음성을 사용합니다.":"Uses Korean voices available on your device.",

  '길찾기':'Directions','커뮤니티':'Community','안전지도':'Safety Map','동작 소식':'Dongjak News','내 정보':'My Info',
  '지도 옵션':'Map Options','지도 표시 옵션':'Map Display Options','보행안전':'Pedestrian Safety','보행안전 도구':'Pedestrian Safety Tools',
  '야간 시야':'Night Visibility','야간 시야 분석':'Night Visibility Analysis','더보기':'More','검색':'Search','장소 검색':'Search places',
  '어디로 가시나요?':'Where are you going?','동작구의 숨은 장소를 찾아보세요':'Find hidden places in Dongjak','내 위치':'My Location',
  '설정':'Settings','다크':'Dark','다크 모드':'Dark Mode','라이트 모드':'Light Mode','업데이트 내역':'Update History',
  '전체 업데이트 내역':'Full Update History','지도 설정':'Map Settings','현재 날씨':'Current Weather','날씨 정보':'Weather',
  '날씨 다시 조회':'Refresh Weather','날씨 조회 중':'Loading weather','날씨 조회 실패':'Weather unavailable','날씨':'Weather',
  '지도 이용 TIP':'Map Tips','지도 조작 안내':'Map Controls Guide','지도 조작 안내 열기':'Open map controls guide',
  '동작구':'Dongjak-gu','동작구 보행안전 지도 서비스':'Dongjak-gu Pedestrian Safety Map',
  '사고·지도자료':'Incidents & Map Data','사고·보행환경 데이터':'Incidents & Walking Environment','안전시설':'Safety Facilities',
  '보호구역·교통':'Protected Zones & Transit','야간시야':'Night Visibility','보행도구':'Walking Tools',
  '필요한 안전정보만 지도에 표시':'Show only the safety information you need','카테고리를 열고 각 항목을 켜거나 끄세요. 지도 범례는 항목 바로 아래에 있습니다.':'Open a category and toggle each layer. The legend appears below each item.',
  '글자 가독성':'Text Readability','글자 크기·굵기':'Text Size & Weight','글자 크기':'Text Size','글자 굵기':'Text Weight',
  '작게':'Small','기본':'Default','크게':'Large','더 크게':'Extra Large','굵게':'Bold',
  '사고·지도자료':'Incidents & Map Data','안전시설':'Safety Facilities','보호구역·교통':'Protected Zones & Transit',
  '도로 돌발정보':'Road Incidents','도시환경 관측':'Urban Environment','보행사고 다발지역':'Pedestrian Crash Hotspots',
  '상도1동 횡단 지점':'Sangdo 1-dong Crossing Survey','방범·어린이 CCTV':'Security & School CCTV',
  '불법주정차 CCTV':'Illegal Parking CCTV','기타·다목적 CCTV':'Other CCTV','보행로 경사도':'Pedestrian Slope',
  '지하철 엘리베이터':'Subway Elevators','보행자 음향신호기':'Accessible Pedestrian Signals','자동심장충격기 AED':'AED',
  '횡단보도':'Crosswalks','약국·편의점':'Pharmacies & Convenience Stores','공공·교육시설':'Public & Education Facilities',
  '지하철 출입구·편의시설':'Station Entrances & Accessibility','어린이·노인 보호구역':'Child & Senior Protection Zones',
  '도로별 제한속도':'Road Speed Limits','무인교통단속카메라':'Traffic Enforcement Cameras','교통약자 모드':'Accessibility Mode',
  '내 주변 보행정보':'Nearby Walking Information','보행불편 제보':'Report a Walking Issue','행정동 선택·경계 보기':'Select Administrative Neighborhood',
  '도로폭 추정 레이어':'Estimated Road Width Layer','지도에 조사 지점 등록':'Add Survey Point','조사지점 필터: 전체':'Survey Filter: All',
  '조사지점 필터: 보행공간':'Survey Filter: Walking Space','조사지점 필터: 교차로·시야':'Survey Filter: Junction & Visibility',
  '조사지점 필터: 횡단시설':'Survey Filter: Crossings','조사지점 필터: 조명·시설물':'Survey Filter: Lighting & Facilities',
  '조사지점 필터: 기타':'Survey Filter: Other','상도1동 사고 집중 검토':'Sangdo 1-dong Crash Review',
  '상도1동 보호구역 전체 보기':'View Protection Zones','상도1동 제한속도 보기':'View Speed Limits',
  '단속카메라 좌표 가져오기':'Import Camera Coordinates','지하철 출구 다시 조회':'Reload Station Exits',
  '추가 보행안전 레이어 모두 끄기':'Turn Off All Added Safety Layers','모두 끄기':'Turn Off All',
  '지도 기본 레이어':'Base Map Layers','보행·생활 안전':'Walking & Daily Safety','조사·관리 및 고급 기능':'Survey, Admin & Advanced Tools',
  '대중교통 시설':'Public Transit','일반 시설':'General Facilities','검색 결과 없음':'No results','추천 장소 · 검색 결과':'Suggestions & Search Results',
  '추천 장소를 선택하거나 검색하세요.':'Choose a suggested place or search.','추천 장소 또는 역명을 선택하세요.':'Choose a suggested place or station.',
  '추천 장소':'Suggested Places','검색을 누르면 장소·주소를 조회합니다.':'Press Search to find places and addresses.',
  '검색 결과가 없습니다. 다른 장소명으로 검색해 주세요.':'No results. Try another place name.',
  '장소를 검색하고 있습니다…':'Searching for places…','전체 검색':'Search All','현재 설정':'Current Setting',
  '데이터 설명':'Data Description','이용 시 참고':'Notes','닫기':'Close','완료':'Done','취소':'Cancel',
  '새로고침':'Refresh','다시 조회':'Refresh','즐겨찾기':'Favorites','즐겨찾기 추가':'Add to Favorites','즐겨찾기 해제':'Remove from Favorites','저장됨':'Saved','삭제':'Delete','공유':'Share',
  '최근 방문 장소':'Recently Viewed Places','저장한 장소 · 대중교통':'Saved Places & Transit','등록 지점':'Registered Points',
  '관심 지점':'Saved Places','내 게시글':'My Posts','등록한 조사 지점':'My Survey Points',
  '즐겨찾기와 계정 정보를 관리할 수 있습니다.':'Manage your saved places and account information.',
  '언어':'Language','언어 변경':'Change Language','한국어':'Korean','English':'English',
  '전체':'All','실시간':'Live','시간표':'Timetable','여기로 도착':'Arrive Here','여기서 출발':'Start Here',
  '이전역':'Previous Station','다음역':'Next Station','대중교통':'Public Transit','시설 정보':'Facility Information',
  '현재 위치 확인':'Locate Me','북쪽 정렬 / 현재 정방향 확인':'Align North','동작구 전체 보기':'View All Dongjak',
  '지도 데이터 출처':'Map Data Sources','지도 옵션 닫기':'Close Map Options','보행안전 메뉴 닫기':'Close Pedestrian Safety Tools',
  '지도 표시 설정':'Map Display Settings','원하는 항목만 표시하세요.':'Choose which layers to display.',
  '지도 추가 도구':'More Map Tools','지도 기능 · 개인 설정':'Map Features & Preferences',
  '화면 모드':'Display Mode','움직임 줄이기':'Reduce Motion','날씨 표시':'Show Weather','지도 조작 버튼':'Map Controls',
  '지도 메뉴와 안내 글씨 크기를 변경합니다.':'Change the text size of menus and guidance.',
  '지도와 화면의 밝기를 변경합니다.':'Change the brightness of the map and interface.',
  '홈 화면에 추가':'Add to Home Screen','업데이트 내역 보기':'View Update History','전체 업데이트 내역 보기':'View All Update Details',
  'iPhone에서 앱처럼 사용하기':'Use as an App on iPhone','Safari · 홈 화면 추가':'Safari · Add to Home Screen',
  'Safari에서 동작하는 안전지도를 엽니다.':'Open the Dongjak pedestrian safety map in Safari.',
  '화면 아래의 공유 버튼을 누릅니다.':'Tap the Share button at the bottom of the screen.',
  'Safari에서 이 지도를 연 다음 공유 버튼 → 홈 화면에 추가를 선택하세요. 홈 화면에 생긴 아이콘으로 실행하면 앱처럼 사용할 수 있습니다.':'Open this map in Safari, tap Share, then choose Add to Home Screen. Launch the app-like experience using the new home screen icon.',
  '보행환경 검토 구간':'Walking Environment Review Segment','도로 정보':'Road Information',
  '추정 도로폭':'Estimated Road Width','미확인':'Unknown','공간분석 수치 자세히':'Spatial Analysis Details',
  '연구팀 조사 기록 (이 브라우저에만 저장)':'Research Team Survey Notes (Stored in This Browser)',
  '이 기기에 저장':'Save on This Device','기록 삭제':'Delete Record','메모':'Notes',
  '지도 이용 안내':'Map Guide','지도 이동':'Move Map','확대·축소':'Zoom','회전':'Rotate','기울기(3D)':'Tilt (3D)',
  'PC':'PC','모바일':'Mobile','원위치':'Reset View','최근 업데이트':'Latest Update',
  '지도 이용 TIP 열기 · 눌러서 지도 조작 안내 보기':'Open map tips · Tap for map controls',
  '검색창':'Search Bar','내 정보 닫고 지도 보기':'Close My Info and return to Map',
  '더보기 닫기':'Close More','모바일 더보기 열기':'Open More','앱 정보 닫기':'Close App Info',
  '지도 설정 닫기':'Close Map Settings','날씨창 닫기':'Close Weather','더보기 닫기':'Close More',
  '현재 날씨를 확인할 수 없습니다':'Weather information is unavailable',
  '표시 레이어':'Visible Layers','지도 레이어 표시 기능은 더보기에서만 사용할 수 있습니다.':'Map layer visibility is managed in More.',
  '보행안전 정보 안내':'Pedestrian Safety Information','지도에 표시할 정보':'Information to Display',
  '레이어를 선택하면 지도에 아이콘과 범례가 적용됩니다.':'Select a layer to show its icons and legend on the map.',
  '교통정보':'Transit Information','정류소 정보':'Stop Information','역 정보':'Station Information',
  '지역 뉴스':'Local News','구청 소식':'District News','새 게시글':'New Post','댓글':'Comments',
  '계정 정보':'Account Information','로그인':'Sign In','로그아웃':'Sign Out','프로필':'Profile','보안':'Security',
  '현재 앱 버전':'Current App Version','지도 조작 안내 열기':'Open Map Guide','업데이트 내역':'Update History','동작 지도':'DONGJAK MAP',
  '전체 업데이트 내역':'Full Update History','지도 설정':'Map Settings','앱 정보':'App Information',

  // v8.6.0 first-run onboarding copy.
  "동작하는 안전지도":"Dongjak Walk Safety",
  "앱 시작 안내":"App introduction",
  "건너뛰기":"Skip",
  "앱 둘러보기":"Explore the app",
  "다음":"Next",
  "이전":"Back",
  "시작하기":"Get started",
  "앱 처음부터 둘러보기":"Explore the app again",
  "앱 사용 안내 다시 보기":"View the app guide again",
  "좌우로 밀어 넘기기":"Swipe left or right",
  "기능 미리보기":"Feature preview",
  "안내 진행률":"Guide progress",
  "안내 페이지 선택":"Choose a guide page",
  "1페이지 보기":"View page 1",
  "2페이지 보기":"View page 2",
  "3페이지 보기":"View page 3",
  "4페이지 보기":"View page 4",
  "5페이지 보기":"View page 5",
  "동작구의 길을 더 안전하게":"Safer walks across Dongjak-gu",
  "보행안전 정보부터 도보 길찾기, 대중교통과 생활 편의까지 한 곳에서 살펴보세요.":"Explore pedestrian safety information, walking directions, public transit and local services in one place.",
  "동작구 주변 정보를 지도에서 확인할 수 있습니다.":"View information around Dongjak-gu on the map.",
  "필요한 기능만 골라서 사용하면 됩니다.":"Choose only the features you need.",
  "안내를 마친 뒤 바로 지도를 이용할 수 있습니다.":"You can go straight to the map after this guide.",
  "필요한 안전정보만 지도에":"Show the safety information you need",
  "보호구역, CCTV, 횡단시설, 보행로 경사도 등 제공되는 안전정보를 선택해 지도에 표시하세요.":"Choose available safety layers such as protected zones, CCTV, crossings and walking-route slopes to display on the map.",
  "지도 옵션과 보행안전 메뉴에서 표시 항목을 조절합니다.":"Choose visible layers in Map Options and Pedestrian Safety.",
  "자료별 범위와 갱신 시점은 서로 다를 수 있습니다.":"Coverage and update schedules vary by data source.",
  "표시된 자료는 보행환경을 살펴보기 위한 참고정보입니다.":"Displayed data is provided as a reference for reviewing walking conditions.",
  "도보 경로를 비교하고 안내받기":"Compare walking routes and get guidance",
  "출발지와 목적지를 지정하고, 필요하면 경유지를 추가해 여러 도보 경로를 비교할 수 있습니다.":"Set a start and destination, add stops if needed, and compare walking routes.",
  "GPS 위치 추적과 음성 안내를 선택할 수 있습니다.":"You can enable GPS tracking and voice guidance.",
  "위치 권한과 기기·네트워크 상태에 따라 이용 범위가 달라집니다.":"Availability depends on location permissions, your device and network conditions.",
  "실제 보행 가능 여부와 현장 상황을 함께 확인하세요.":"Check actual pedestrian access and local conditions as you go.",
  "교통과 생활정보도 함께":"Transit and local information together",
  "버스·지하철 도착정보와 시간표, 주변 생활시설, 동작구 소식을 검색할 수 있습니다.":"Search for bus and subway arrivals, timetables, nearby services and Dongjak-gu news.",
  "교통정보는 제공 기관과 노선에 따라 지원 범위가 다릅니다.":"Transit coverage varies by provider and route.",
  "도착 예정·추정 정보는 실제 운행 상황과 차이가 날 수 있습니다.":"Predicted arrival and location information may differ from actual operations.",
  "검색창에서 역·정류장·장소를 함께 찾아보세요.":"Search for stations, bus stops and places in the search bar.",
  "로그인하면 즐겨찾기를 이어서":"Keep your favorites with an account",
  "로그인 전에는 즐겨찾기가 이 기기에 저장됩니다. 로그인하면 지원되는 즐겨찾기를 계정과 동기화할 수 있습니다.":"Before signing in, favorites are saved on this device. After signing in, supported favorites can sync with your account.",
  "카카오 또는 이메일 로그인을 지원합니다.":"Sign in with Kakao or email.",
  "로그인하지 않아도 지도와 주요 기능을 이용할 수 있습니다.":"You can use the map and core features without signing in.",
  "계정과 로그인은 하단의 내 정보에서 관리할 수 있습니다.":"Manage your account and sign-in from My Info in the bottom navigation.",
  "내 정보에서 로그인 관리":"Manage sign-in in My Info",
  "동작구 지도 화면을 표현한 일러스트":"Illustration of the Dongjak-gu map screen",
  "보행안전 정보 레이어를 표현한 일러스트":"Illustration of pedestrian safety layers",
  "도보 경로 안내를 표현한 일러스트":"Illustration of walking route guidance",
  "대중교통과 생활정보를 표현한 일러스트":"Illustration of transit and local information",
  "계정과 즐겨찾기 동기화를 표현한 일러스트":"Illustration of account and favorites sync",});
const EN_TO_KO=Object.freeze({
  'CURRENT WEATHER':'날씨 정보','MAP PREFERENCES':'지도 설정','NIGHT VISIBILITY':'야간 시야',
  'DONGJAK WALK SAFETY':'동작하는 안전지도','DONGJAK MAP':'동작 지도','UPDATE HISTORY':'업데이트 내역'
});
const ATTRIBUTE_NAMES=['placeholder','title','aria-label','aria-description','alt','data-dj832-label'];
const SKIP_TAGS=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','CODE','PRE']);
const originalText=new WeakMap(),originalAttrs=new WeakMap();
function normalize(value){return String(value??'').replace(/\s+/g,' ').trim();}
function translatePhrase(raw,language){
  const value=normalize(raw);if(!value)return raw;
  let translated;
  if(language==='en')translated=KO_TO_EN[value]||value;
  else translated=EN_TO_KO[value]||value;
  if(language==='en'){
    let m=value.match(/^(\d+)개 결과$/);if(m)return `${m[1]} results`;
    m=value.match(/^표시 (\d+)$/);if(m)return `${m[1]} visible`;
    m=value.match(/^(\d+)개 켜짐$/);if(m)return `${m[1]} active`;
    m=value.match(/^장소 추천 (\d+)건 · 더 찾으려면 검색$/);if(m)return `${m[1]} place suggestions · press Search for more`;
    m=value.match(/^저장된 장소·교통시설 (\d+)개 · 추가 검색 중$/);if(m)return `${m[1]} saved places/transit · searching more`;
  }
  return translated;
}
function textValue(raw,language){
  const str=String(raw??'');const match=str.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if(!match)return str;
  const core=match[2];const translated=translatePhrase(core,language);
  return match[1]+translated+match[3];
}
function translateTextNode(node,language){
  if(!node||node.nodeType!==3)return;
  const parent=node.parentElement;if(!parent||SKIP_TAGS.has(parent.tagName)||parent.closest('[data-dj-no-translate],.dj-place-ai-section'))return;
  let state=originalText.get(node);
  if(!state){state={original:node.nodeValue,rendered:node.nodeValue};originalText.set(node,state);}
  else if(node.nodeValue!==state.rendered){state.original=node.nodeValue;}
  const next=textValue(state.original,language);
  if(node.nodeValue!==next){state.rendered=next;node.nodeValue=next;}else state.rendered=next;
}
function translateAttributes(element,language){
  if(!element||element.nodeType!==1||SKIP_TAGS.has(element.tagName))return;
  let state=originalAttrs.get(element);if(!state){state=new Map();originalAttrs.set(element,state);}
  for(const name of ATTRIBUTE_NAMES){
    if(!element.hasAttribute(name))continue;
    const current=element.getAttribute(name);let item=state.get(name);
    if(!item){item={original:current,rendered:current};state.set(name,item);}
    else if(current!==item.rendered)item.original=current;
    const next=textValue(item.original,language);
    if(current!==next){element.setAttribute(name,next);item.rendered=next;}else item.rendered=next;
  }
}
function walk(root,language){
  if(!root)return;
  if(root.nodeType===3){translateTextNode(root,language);return;}
  if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
  if(root.nodeType===1){translateAttributes(root,language);if(SKIP_TAGS.has(root.tagName))return;}
  const owner=root.ownerDocument||root;const walker=owner.createTreeWalker(root,4);
  let node;while((node=walker.nextNode()))translateTextNode(node,language);
  if(root.querySelectorAll)root.querySelectorAll('*').forEach(el=>translateAttributes(el,language));
}
export function installLanguagePreference(doc=document,win=window){
  const app=doc.getElementById('app'),mine=doc.getElementById('mine-panel');if(!app||!mine)return ()=>{};
  let language='ko';try{language=win.localStorage.getItem(STORAGE_KEY)==='en'?'en':'ko';}catch{}
  const body=mine.querySelector('.dj836-sheet-body')||mine;
  let section=body.querySelector('.dj854-language-section');
  if(!section){
    section=doc.createElement('section');section.className='dj854-language-section';
    const label=doc.createElement('label');label.htmlFor='dj854-language-select';label.textContent='언어';
    const select=doc.createElement('select');select.id='dj854-language-select';select.setAttribute('aria-label','언어 변경');select.setAttribute('data-dj-no-translate','');
    for(const [value,text] of [['ko','한국어'],['en','English']]){const option=doc.createElement('option');option.value=value;option.textContent=text;select.append(option);}
    section.append(label,select);body.prepend(section);
    select.addEventListener('change',()=>setLanguage(select.value));
  }
  const select=section.querySelector('select');
  let observer=null,queued=false;
  function apply(){
    doc.documentElement.lang=language==='en'?'en':'ko';
    app.dataset.djLanguage=language;select.value=language;
    const search=doc.getElementById('map-quick-search-query');
    if(search)search.placeholder=language==='en'?'Where are you going?':'어디로 가시나요?';
    walk(app,language);
    const languageLabel=section.querySelector('label');if(languageLabel)languageLabel.textContent=language==='en'?'Language':'언어';
    select.setAttribute('aria-label',language==='en'?'Change language':'언어 변경');
    for(const option of select.options){option.textContent=option.value==='en'?'English':'한국어';}
    win.dispatchEvent(new CustomEvent('dongjak:language-change',{detail:{language}}));
  }
  function setLanguage(value){language=value==='en'?'en':'ko';try{win.localStorage.setItem(STORAGE_KEY,language);}catch{}apply();}
  observer=new MutationObserver(records=>{
    if(queued)return;queued=true;
    win.queueMicrotask(()=>{
      queued=false;
      for(const record of records){
        if(record.type==='characterData')translateTextNode(record.target,language);
        else if(record.type==='attributes')translateAttributes(record.target,language);
        else for(const node of record.addedNodes)walk(node,language);
      }
      // Do not write unchanged preference controls from inside this observer.
      // Assigning label.textContent unconditionally creates another childList
      // mutation and can starve the browser's rendering/event loop forever.
      // These controls are already updated when the language changes in apply().
    });
  });
  observer.observe(app,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRIBUTE_NAMES});
  apply();
  return ()=>{observer?.disconnect();};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const start=()=>installLanguagePreference(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
