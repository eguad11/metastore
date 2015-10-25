/**
 * Главное окно интернет-магазина
 * Created 21.10.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author    Evgeniy Malyarov
 * @module  init.js
 */

/**
 * Процедура устанавливает параметры работы программы, специфичные для текущей сборки
 * @param prm {Object} - в свойствах этого объекта определяем параметры работы программы
 * @param modifiers {Array} - сюда можно добавить обработчики, переопределяющие функциональность объектов данных
 */
$p.settings = function (prm, modifiers) {

	// для транспорта используем rest, а не сервис http
	prm.rest = true;
	prm.irest_enabled = true;

	// расположение rest-сервиса ut
	prm.rest_path = "/a/ut11/%1/odata/standard.odata/";

	// по умолчанию, обращаемся к зоне %%%
	prm.zone = 0;

	// расположение файлов данных
	prm.data_url = "data/";

	// расположение файла инициализации базы sql
	prm.create_tables = "data/create_tables.sql";

	// расположение страницы настроек
	prm.settings_url = "settings.html";

	// разрешаем сообщения от других окон
	prm.allow_post_message = "*";

	// используем геокодер
	prm.use_google_geo = false;

	// логин гостевого пользователя
	prm.guest_name = "АлхимовАА";

	// пароль гостевого пользователя
	prm.guest_pwd = "";

	// разрешаем покидать страницу без лишних вопросов
	$p.eve.redirect = true;

};

/**
 * Рисуем основное окно при инициализации документа
 */
$p.iface.oninit = function() {

	function oninit(){

		var toolbar, hprm, items = [
			{id: "catalog", text: "Каталог", icon: "search_48.png"},
			{id: "compare", text: "Сравнение", icon: "compare_48.png"},
			{id: "cart", text: "Корзина", icon: "shop_cart_48.png"},
			{id: "orders", text: "Заказы", icon: "projects_48.png"},
			{id: "user", text: "Профиль", icon: "contacts_48.png"},
			{id: "settings", text: "Настройки", icon: "settings_48.png"}
		] ;

		//$p.eve.redirect = true;

		document.body.removeChild(document.querySelector("#webshop_splash"));

		// при первой возможности создаём layout
		if($p.device_type == "desktop"){

			$p.iface.main = new dhtmlXSideBar({
				parent: document.body,
				icons_path: dhtmlx.image_path + "dhxsidebar_web/",
				width: 100,
				template: "icons_text",
				items: items,
				offsets: {
					top: 0,
					right: 0,
					bottom: 0,
					left: 0
				}
			});

			toolbar = $p.iface.main.attachToolbar({
				icons_size: 24,
				icons_path: dhtmlx.image_path + "dhxsidebar_web/",
				items: [
					{type: "text", id: "title", text: "&nbsp;"},
					{type: "spacer"},
					{type: "button", id: "add", img: "add_48.png"},
					{type: "button", id: "save", img: "save_48.png"}
				]
			});

		}else{
			$p.iface.main = new dhtmlXSideBar({
				parent: document.body,
				icons_path: dhtmlx.image_path + "dhxsidebar_web/",
				width: 180,
				header: true,
				template: "tiles",
				autohide: true,
				items: items
			});
		}


		$p.iface.main.attachEvent("onSelect", function(id){

			if($p.device_type == "desktop")
				toolbar.setItemText("title", window.dhx4.template("<span style='font-weight: bold; font-size: 14px;'>#text#</span>", {text: this.cells(id).getText().text}));

			hprm = $p.job_prm.parse_url();
			if(hprm.view != id)
				$p.iface.set_hash(hprm.obj, hprm.ref, hprm.frm, id);

			$p.iface["set_view_" + id]($p.iface.main.cells(id));

		});

		hprm = $p.job_prm.parse_url();
		if(!hprm.view || $p.iface.main.getAllItems().indexOf(hprm.view) == -1)
			$p.iface.set_hash(hprm.obj, hprm.ref, hprm.frm, "catalog");
		else
			setTimeout($p.iface.hash_route, 10);
	}

	function log_in(){

		var stepper = $p.eve.stepper,
			data_url = $p.job_prm.data_url || "/data/",
			parts = [],
			mreq, mpatch, p_0, mdd;


		stepper.zone = $p.wsql.get_user_param("zone") + "/";

		parts.push($p.ajax.get(data_url + "meta.json?v="+$p.job_prm.files_date));
		parts.push($p.ajax.get(data_url + "meta_patch.json?v="+$p.job_prm.files_date));
		parts.push($p.ajax.get(data_url + "zones/" + stepper.zone + "p_0.json?v="+$p.job_prm.files_date));

		// читаем файл метаданных, файл патча метаданных и первый файл снапшота
		return $p.eve.reduce_promices(parts, function (req) {
			if(req instanceof XMLHttpRequest && req.status == 200){
				if(req.responseURL.indexOf("meta.json") != -1)
					mreq = JSON.parse(req.response);

				else if(req.responseURL.indexOf("meta_patch.json") != -1)
					mpatch = JSON.parse(req.response);

				else if(req.responseURL.indexOf("p_0.json") != -1)
					p_0 = JSON.parse(req.response);
			}else{
				console.log(req);
			}
		})
			// создаём объект Meta() описания метаданных
			.then(function () {
				if(!mreq)
					throw Error("Ошибка чтения файла метаданных");
				else
					return new $p.Meta(mreq, mpatch);
			})

			// из содержимого первого файла получаем количество файлов и загружаем их все
			.then(function (req) {

				stepper.files = p_0.files-1;
				stepper.step_size = p_0.files > 0 ? Math.round(p_0.count_all / p_0.files) : 57;
				stepper.cat_ini_date = p_0["cat_date"];
				$p.eve.from_json_to_data_obj(p_0);

			})

			// формируем массив url файлов данных зоны
			.then(function () {

				parts = [];
				for(var i=1; i<=stepper.files; i++)
					parts.push($p.ajax.get(data_url + "zones/" + stepper.zone + "p_" + i + ".json?v="+$p.job_prm.files_date));
				parts.push($p.ajax.get(data_url + "zones/" + stepper.zone + "ireg.json?v="+$p.job_prm.files_date));

				return $p.eve.reduce_promices(parts, $p.eve.from_json_to_data_obj);

			})

			// читаем справочники с ограниченным доступом, которые могли прибежать вместе с метаданными
			.then(function () {
				stepper.step_size = 57;
			})

	}

	log_in()
		.then(oninit)
		.catch(function (err) {
			console.log(err);
		})
		.then(function (err) {
			if($p.iface.sync)
				$p.iface.sync.close();
		});
};

/**
 * Обработчик маршрутизации
 * @param hprm
 * @return {boolean}
 */
$p.eve.hash_route.push(function (hprm) {

	// view отвечает за переключение закладки в SideBar
	if(hprm.view && $p.iface.main.getActiveItem() != hprm.view){
		$p.iface.main.getAllItems().forEach(function(item){
			if(item == hprm.view)
				$p.iface.main.cells(item).setActive(true);
		});
	}
	return false;
});