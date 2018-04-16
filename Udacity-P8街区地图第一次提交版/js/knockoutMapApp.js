"use strict";
let newEmbassyNameList = [];//存贮搜索到的地点数据的地点名称
let newEmbassyLanLngList = [];//存贮搜索到的地点数据的经纬度
let newEmbassyMarkerList = [];//存贮搜索到的地点数据的标记
let toggleBounce,map,infowindow,pos,weather,marker;

const ViewModel = function(){
    const self = this;//保证this在该作用域中永远指代ViewModel
    this.embassyName = ko.observableArray([]);//数据绑定到监控数组中
    newEmbassyNameList.forEach(function(cv){
        self.embassyName.push(cv);//将地点数据的名称存贮到监控数组中
    });

    this.listClick = function(evt){
        const clickListName = event.target.innerHTML;//绑定点击事件，借鉴论坛上他人关于如何侦测事件的代码
        for (let i = 0; i < newEmbassyNameList.length; i++) {
            if (clickListName === newEmbassyNameList[i]) {//如果点击的目标与地点名称数组中的某个元素相等，则以该元素为中心并放大地图。触发与地点名称数组内元素顺序一致的
                map.setCenter(newEmbassyLanLngList[i]);
                map.setZoom(16);
                google.maps.event.trigger(newEmbassyMarkerList[i], 'click');//模拟触发与地点名称数组内元素顺序一致的标记数组中相同顺序的元素的标记的点击事件
                }
            }
        };

    this.embassyToFind = ko.computed({
        read: function () {
            return null
        },
        write: function (value) {
          //以下借鉴论坛上他人有关筛选的代码，并根据自己的实际做了修改
            if (value){//如果有输入，则执行以下程序
                return ko.utils.arrayFilter(newEmbassyNameList, function(el, index) {//筛选在地点名称数组中与输入值匹配的数据
                    if(el.indexOf(value) >= 0){//如果输入值存在于当前的数据中，则执行下一步
                        map.setCenter(newEmbassyLanLngList[index]);
                        map.setZoom(17);
                        google.maps.event.trigger(newEmbassyMarkerList[index], 'click');
                        self.embassyName.splice(0);//清空绑定的数组
                        self.embassyName.push(el);//将筛选到的数据传入绑定数组
                    }
                });
            }

            if (!value){//如果没有输入值，则恢复之前绑定数组的状态
                self.embassyName.splice(0);
                newEmbassyNameList.forEach(function(cv){
                    self.embassyName.push(cv);
                });
                map.setZoom(13);
            }
        }
    });
};

//异步提取北京的天气数据，并把数据传到信息窗口中
fetch('http://api.weatherunlocked.com/api/current/39.93,116.43?lang=CN&app_id=e5a6e7bc&app_key=04594a470555d883f8c3dc0147f57c0c').then(
    function(response){
        if(response.status!==200){
            console.log("存在问题，状态码为："+response.status);
            return;
        }
        response.json().then(function(data){
            weather = data.wx_desc;//参照教程，通过debugg,并打印data,找到.wx_desc为天气数据
        });
  　}
).catch(function(err){
      alert("Fetch错误:"+err);
  });

//在谷歌地图地点库文档的模板样例的基础上，构建地图，搜索指定地点附近的数据，并做相应的处理。以地点库附近搜索到的数据为基础构建标记，并绑定信息窗口的位置。
function initMap() {
    pos = new google.maps.LatLng(39.9328,116.4326);//北京
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: pos
    });

    infowindow = new google.maps.InfoWindow();//信息窗口

    let service = new google.maps.places.PlacesService(map);//地点库
    service.nearbySearch({//附近搜索
        location: pos,
        radius: 50000,
        type: ['embassy']
    },callback);

    function callback(results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            for (let i = 0; i < results.length; i++) {
                newEmbassyNameList.push(results[i].name);//提取place库中通过附近搜索获得的地点数组的名字
                newEmbassyLanLngList.push(results[i].geometry.location);
                createMarker(results[i]);
                newEmbassyMarkerList.push(marker);
            };
        }
        ko.applyBindings(new ViewModel());//告诉ko绑定到ViewModel，以启动应用
    };

    function createMarker(place) {
        marker = new google.maps.Marker({
            map: map,
            animation: google.maps.Animation.DROP,//动画
            position: place.geometry.location
        });
        google.maps.event.addListener(marker, 'click', (function(markerCopy) {//用闭包立即执行函数的方法解决marker总是指向最后一个数据，即肯尼亚大使馆的问题，进而实现动画。
            return function(){
            infowindow.setContent(place.name+"<br>"+"天气:"+weather);//place库中通过附近搜索获得的地点数组的名字放入信息窗口
            infowindow.open(map, this);
            markerCopy.setAnimation(google.maps.Animation.BOUNCE);//动画跳跃
            setTimeout(function() {
                markerCopy.setAnimation(null);//延时停止动画
            }, 1200);
            };
        })(marker));//向立即执行函数传入当前的marker
    };
};
