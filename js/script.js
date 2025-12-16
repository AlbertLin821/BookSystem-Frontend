/**
 * @author GSS Workshop
 * @version 1.0
 */

/** @type {Array<Object>} 從 localStorage 載入的書籍資料陣列 */
var bookDataFromLocalStorage = [];

/** @type {Array<Object>} 從 localStorage 載入的借閱紀錄資料陣列 */
var bookLendDataFromLocalStorage =[];

/** @type {string} 目前的操作狀態（""=顯示模式, "add"=新增模式, "update"=修改模式） */
var state="";

/** @type {Object} 操作狀態選項*/
var stateOption={
    "add":"add",
    "update":"update"
}


$(function () {
    loadBookData();
    registerRegularComponent();

    // 統一建立 Kendo Window
    createKendoWindow("#book_detail_area", {
        width: "1200px",
        title: "新增書籍"
    });

    createKendoWindow("#book_record_area", {
        width: "700px",
        title: "借閱紀錄"
    });
    
    // 在查詢表單中建立一個隱藏的 input 用於驗證至少一個查詢條件
    $("#book_query_form").append('<input type="hidden" id="query_condition_input" name="query_condition" required data-at-least-one-query-condition-msg="請至少輸入一個查詢條件" />');
    
    // 初始化查詢表單驗證器
    $("#book_query_form").kendoValidator({
        rules: {
            required: function(input) {
                // 處理查詢條件的驗證
                if (input.attr("name") === "query_condition") {
                    var bookName = $("#book_name_q").val() || "";
                    var bookClassId = $("#book_class_q").data("kendoDropDownList");
                    var bookKeeperId = $("#book_keeper_q").data("kendoDropDownList");
                    var bookStatusId = $("#book_status_q").data("kendoDropDownList");
                    
                    var hasBookClass = bookClassId && bookClassId.value() && bookClassId.value() !== "";
                    var hasBookKeeper = bookKeeperId && bookKeeperId.value() && bookKeeperId.value() !== "";
                    var hasBookStatus = bookStatusId && bookStatusId.value() && bookStatusId.value() !== "";
                    
                    return bookName.trim() !== "" || hasBookClass || hasBookKeeper || hasBookStatus;
                }
                // 其他欄位不驗證（查詢條件都是選填的）
                return true;
            }
        },
        messages: {
            required: function(input) {
                if (input.attr("name") === "query_condition") {
                    return input.attr("data-at-least-one-query-condition-msg") || "請至少輸入一個查詢條件";
                }
                return "此欄位為必填";
            }
        }
    });
    
    // 初始化表單驗證器
    $("#book_detail_area").kendoValidator({
        rules: {
            required: function(input) {
                // 根據欄位名稱和狀態決定是否需要驗證
                var fieldName = input.attr("name");
                
                // 圖書類別不是必填，跳過驗證
                // 使用多種方式檢查，確保圖書類別完全被跳過
                if (input.is("[name='book_class_d']") || 
                    input.attr("id") === "book_class_d" || 
                    fieldName === "book_class_d") {
                    // 清除任何可能的錯誤訊息
                    $("span[data-for='book_class_d']").hide();
                    input.removeClass("k-invalid");
                    return true; // 跳過驗證，圖書類別不是必填
                }
                
                // 處理 Kendo DatePicker（購買日期）
                if (input.is("[name='book_bought_date_d']")) {
                    var datePicker = input.data("kendoDatePicker");
                    if (datePicker) {
                        var value = datePicker.value();
                        var isValid = value !== null && value !== undefined;
                        
                        // 驗證日期是否合法
                        if (isValid && value) {
                            try {
                                var dateStr = kendo.toString(value, "yyyy-MM-dd");
                                var parsedDate = kendo.parseDate(dateStr, "yyyy-MM-dd");
                                
                                // 檢查日期是否為有效日期
                                if (!parsedDate || isNaN(parsedDate.getTime())) {
                                    return false;
                                }
                                
                                // 同步值到原始 input（儲存格式為 yyyy-MM-dd）
                                input.val(dateStr);
                            } catch (e) {
                                console.log("日期轉換錯誤：", e);
                                return false;
                            }
                        }
                        return isValid;
                    }
                    return input.val() !== "";
                }
                
                // 處理借閱狀態 DropDownList
                if (input.is("[name='book_status_d']")) {
                    // 新增模式下不驗證
                    if (state === "add") {
                        return true;
                    }
                    var dropdown = input.data("kendoDropDownList");
                    if (dropdown) {
                        var value = dropdown.value();
                        return value !== "" && value !== null && value !== undefined;
                    }
                    return input.val() !== "";
                }
                
                // 處理借閱人 DropDownList
                if (input.is("[name='book_keeper_d']")) {
                    // 新增模式下不驗證
                    if (state === "add") {
                        return true;
                    }
                    var dropdown = input.data("kendoDropDownList");
                    if (dropdown) {
                        var bookStatusId = $("#book_status_d").data("kendoDropDownList").value();
                        // 如果借閱狀態為「可以借出」或「不可借出」，則借閱人不必填
                        if (bookStatusId === "A" || bookStatusId === "U") {
                            return true;
                        }
                        // 如果借閱狀態為「已借出」或「已借出(未領)」，則借閱人必填
                        var value = dropdown.value();
                        return value !== "" && value !== null && value !== undefined;
                    }
                    return input.val() !== "";
                }
                
                // 處理 textarea
                if (input.is("[name='book_note_d']")) {
                    var value = input.val();
                    // 檢查是否為空字串（去除空白後）
                    return value !== null && value !== undefined && value.trim() !== "";
                }
                
                // 處理一般輸入欄位
                var value = input.val();
                return value !== null && value !== undefined && value.trim() !== "";
            }
        },
        messages: {
            required: function(input) {
                // 購買日期的特殊錯誤訊息
                if (input.is("[name='book_bought_date_d']")) {
                    var datePicker = input.data("kendoDatePicker");
                    if (datePicker) {
                        var value = datePicker.value();
                        if (value === null || value === undefined) {
                            return "購買日期不可空白";
                        }
                        // 檢查日期是否合法
                        try {
                            var dateStr = kendo.toString(value, "yyyy-MM-dd");
                            var parsedDate = kendo.parseDate(dateStr, "yyyy-MM-dd");
                            if (!parsedDate || isNaN(parsedDate.getTime())) {
                                return "日期異常請重新填寫";
                            }
                        } catch (e) {
                            return "日期異常請重新填寫";
                        }
                    }
                    return "購買日期不可空白";
                }
                
                // 借閱人的特殊錯誤訊息
                if (input.is("[name='book_keeper_d']")) {
                    var bookStatusId = $("#book_status_d").data("kendoDropDownList").value();
                    if (bookStatusId === "B" || bookStatusId === "C") {
                        return "借閱狀態為「已借出」時，借閱人為必填欄位";
                    }
                }
                
                // 使用自訂的驗證訊息
                var message = input.attr("validationMessage");
                if (message) {
                    return message;
                }
                return "此欄位為必填";
            }
        }
    });

    $("#btn_add_book").click(function (e) {
        e.preventDefault();
        state=stateOption.add;
        clear();
        setStatusKeepRelation();
        $("#btn-save").css("display","");        
        $("#book_detail_area").data("kendoWindow").title("新增書籍");
        $("#book_detail_area").data("kendoWindow").open();
    });


    $("#btn_query").click(function (e) {
        e.preventDefault();
        
        // 使用 Kendo Validator 驗證查詢條件
        var validator = $("#book_query_form").data("kendoValidator");
        
        if (!validator || typeof validator.validate !== "function") {
            console.log("查詢表單驗證器不存在或無法使用");
            queryBook(); // 如果驗證器不存在，直接執行查詢
            return;
        }
        
        // 同步所有 DropDownList 的值到原始 input
        var bookClassDropdown = $("#book_class_q").data("kendoDropDownList");
        if (bookClassDropdown) {
            $("#book_class_q").val(bookClassDropdown.value());
        }
        
        var bookKeeperDropdown = $("#book_keeper_q").data("kendoDropDownList");
        if (bookKeeperDropdown) {
            $("#book_keeper_q").val(bookKeeperDropdown.value());
        }
        
        var bookStatusDropdown = $("#book_status_q").data("kendoDropDownList");
        if (bookStatusDropdown) {
            $("#book_status_q").val(bookStatusDropdown.value());
        }
        
        // 執行驗證
        var validationResult = validator.validate();
        
        if (!validationResult) {
            console.log("查詢條件驗證失敗");
            return;
        }
        
        // 清除錯誤訊息
        $("span[data-for='query_condition']").hide();
        
        queryBook();
    });

    $("#btn_clear").click(function (e) {
        e.preventDefault();
        clear();
        
        // 清除查詢表單的驗證錯誤訊息
        var queryValidator = $("#book_query_form").data("kendoValidator");
        if (queryValidator) {
            queryValidator.hideMessages();
        }
        $("span[data-for='query_condition']").hide();
        
        queryBook();
    });

    $("#btn-save").click(function (e) {
        e.preventDefault();
        
        console.log("存檔按鈕被點擊，目前狀態：", state);
        
        // Kendo Validator 檢查欄位
        var validator = $("#book_detail_area").data("kendoValidator");
        
        if (!validator || typeof validator.validate !== "function") {
            console.log("驗證器不存在或無法使用");
            return;
        }
        
        // 驗證前同步所有 Kendo 控制項的值到原始 input 元素
        var bookClassDropdown = $("#book_class_d").data("kendoDropDownList");
        if (bookClassDropdown) {
            var bookClassValue = bookClassDropdown.value();
            $("#book_class_d").val(bookClassValue);
        }
        
        var datePicker = $("#book_bought_date_d").data("kendoDatePicker");
        if (datePicker) {
            var dateValue = datePicker.value();
            if (dateValue) {
                try {
                    var dateStr = kendo.toString(dateValue, "yyyy-MM-dd");
                    var parsedDate = kendo.parseDate(dateStr, "yyyy-MM-dd");
                    if (parsedDate && !isNaN(parsedDate.getTime())) {
                        $("#book_bought_date_d").val(dateStr);
                    } else {
                        alert("日期異常請重新填寫");
                        validator.validateInput($("#book_bought_date_d"));
                        return;
                    }
                } catch (e) {
                    alert("日期異常請重新填寫");
                    validator.validateInput($("#book_bought_date_d"));
                    return;
                }
            }
        }
        
        var bookStatusDropdown = $("#book_status_d").data("kendoDropDownList");
        if (bookStatusDropdown) {
            var bookStatusValue = bookStatusDropdown.value();
            $("#book_status_d").val(bookStatusValue);
        }
        
        var bookKeeperDropdown = $("#book_keeper_d").data("kendoDropDownList");
        if (bookKeeperDropdown) {
            var bookKeeperValue = bookKeeperDropdown.value();
            $("#book_keeper_d").val(bookKeeperValue);
        }
        
        // 執行整體驗證
        var validationResult = validator.validate();
        
        // 驗證後，強制清除圖書類別的驗證錯誤（因為圖書類別不是必填）
        var bookClassInput = $("#book_class_d");
        $("span[data-for='book_class_d']").hide();
        bookClassInput.removeClass("k-invalid");
        
        if (!validationResult) {
            // 檢查驗證錯誤，排除圖書類別的錯誤
            var errors = validator.errors();
            var hasNonBookClassError = false;
            
            // 檢查每個欄位的驗證狀態
            $("#book_detail_area").find("[name]").each(function() {
                var input = $(this);
                var fieldName = input.attr("name");
                
                // 跳過圖書類別
                if (fieldName === "book_class_d") {
                    return;
                }
                
                var isValid = validator.validateInput(input);
                if (!isValid) {
                    hasNonBookClassError = true;
                    console.log("驗證失敗的欄位：", fieldName, "值：", input.val());
                }
            });
            
            // 如果只有圖書類別驗證失敗，清除錯誤並繼續
            if (!hasNonBookClassError) {
                console.log("只有圖書類別驗證失敗，清除錯誤並繼續");
                $("span[data-for='book_class_d']").hide();
                bookClassInput.removeClass("k-invalid");
            } else {
                // 有其他欄位驗證失敗，顯示錯誤並返回
                console.log("表單驗證失敗，有其他欄位驗證失敗");
                return;
            }
        }
        
        console.log("表單驗證通過");
        
        // 業務邏輯驗證 - 修改模式下，借閱狀態為 已借出 時，借閱人為必填
        // 此驗證已在驗證器中處理，此處作為額外檢查
        if(state == "update"){
            var bookStatusId = $("#book_status_d").data("kendoDropDownList").value();
            var bookKeeperId = $("#book_keeper_d").data("kendoDropDownList").value();
            
            if((bookStatusId == "B" || bookStatusId == "C") && (bookKeeperId == "" || bookKeeperId == null)){
                // 觸發驗證以顯示錯誤訊息
                validator.validateInput($("#book_keeper_d"));
                return;
            }
        }
        
        var bookId = $("#book_id_d").val();
        
        switch (state) {
            case "add":
                addBook();
                console.log("書籍新增成功，資料已儲存至 localStorage");
                break;
            case "update":
                updateBook(bookId);
                console.log("書籍更新成功，資料已儲存至 localStorage");
                break;
            default:
                break;
        }
        
    });

    $("#book_grid").kendoGrid({
        // 資料來源設定
        dataSource: {
            // 使用從 localStorage 載入的書籍資料
            data: bookDataFromLocalStorage,
            // 資料結構定義
            schema: {
                model: {
                    // 主鍵欄位名稱
                    id:"BookId",
                    // 欄位型別定義
                    fields: {
                        BookId: { type: "int" },
                        BookClassName: { type: "string" },
                        BookName: { type: "string" },
                        BookBoughtDate: { type: "string" },
                        BookStatusName: { type: "string" },
                        BookKeeperCname: { type: "string" }
                    }
                }
            },
            // 每頁顯示筆數
            pageSize: 20,
        },
        // Grid 高度
        height: 550,
        // 啟用欄位排序功能
        sortable: true,
        // 分頁設定
        pageable: {
            input: true,      // 顯示頁碼輸入框
            numeric: false    // 不顯示數字頁碼按鈕
        },
        // 欄位定義
        columns: [
            { field: "BookId", title: "書籍編號", width: "10%" },
            { field: "BookClassName", title: "圖書類別", width: "15%" },
            // 書名欄位使用自訂模板，顯示為可點擊的超連結
            { field: "BookName", title: "書名", width: "30%" ,
              template: "<a style='cursor:pointer; color:blue' onclick='showBookForDetail(event,#:BookId #)'>#: BookName #</a>"
            },
            { field: "BookBoughtDate", title: "購書日期", width: "15%" },
            { field: "BookStatusName", title: "借閱狀態", width: "15%" },
            { field: "BookKeeperCname", title: "借閱人", width: "15%" },
            // 操作按鈕欄位
            { command: { text: "借閱紀錄", click: showBookLendRecord }, title: " ", width: "120px" },
            { command: { text: "修改", click: showBookForUpdate }, title: " ", width: "100px" },
            { command: { text: "刪除", click: deleteBook }, title: " ", width: "100px" }
        ]

    });

    $("#book_record_grid").kendoGrid({
        dataSource: {
            // 初始為空陣列，資料會根據選取的書籍動態載入
            data: [],
            schema: {
                model: {
                    fields: {
                        LendDate: { type: "string" },
                        BookKeeperId: { type: "string" },
                        BookKeeperEname: { type: "string" },
                        BookKeeperCname: { type: "string" }
                    }
                }
            },
            pageSize: 20,
        },
        height: 250,
        sortable: true,
        pageable: {
            input: true,
            numeric: false
        },
        columns: [
            { field: "LendDate", title: "借閱日期", width: "10%" },
            { field: "BookKeeperId", title: "借閱人編號", width: "10%" },
            { field: "BookKeeperEname", title: "借閱人英文姓名", width: "15%" },
            { field: "BookKeeperCname", title: "借閱人中文姓名", width: "15%" },
        ]
    });

})

/**
 * 初始化 localStorage 資料
 * 將 data 資料夾中的預設資料寫入 localStorage（如果 localStorage 中沒有資料）
 */
function loadBookData() {
    // 嘗試從 localStorage 讀取書籍資料
    bookDataFromLocalStorage = JSON.parse(localStorage.getItem("bookData"));
    
    // 如果 localStorage 中沒有資料，使用預設資料並寫入 localStorage
    if (bookDataFromLocalStorage == null) {
        bookDataFromLocalStorage = bookData;
        localStorage.setItem("bookData", JSON.stringify(bookDataFromLocalStorage));
    }

    // 嘗試從 localStorage 讀取借閱紀錄資料
    bookLendDataFromLocalStorage = JSON.parse(localStorage.getItem("lendData"));
    
    // 如果 localStorage 中沒有資料，使用預設資料並寫入 localStorage
    if (bookLendDataFromLocalStorage == null) {
        bookLendDataFromLocalStorage = lendData;
        localStorage.setItem("lendData", JSON.stringify(bookLendDataFromLocalStorage));
    }
}

/**
 * TODO: 圖書類別變更時更新圖片
 * 當選擇圖書類別時，自動更新對應的類別圖片（圖片檔名格式：{類別代碼}.jpg）
 */
function onChange() {
    var selectedValue = $("#book_class_d").data("kendoDropDownList").value();
    if(selectedValue==="" || selectedValue==null){
        $("#book_image_d").attr("src", "image/optional.jpg");
    }else{
        $("#book_image_d").attr("src", "image/" + selectedValue + ".jpg");
    }
}


/**
 * TODO: 新增書籍功能
 * 自動產生新的書籍編號，從表單取得資料建立書籍物件，預設借閱狀態為 可以借出，
 * 將新書籍加入資料陣列並更新 localStorage 和 Grid
 */
function addBook() { 
    var grid=$("#book_grid").data("kendoGrid");
    
    // 自動產生新的書籍編號 找出現有最大 BookId 加 1
    var maxBookId = 0;
    if(bookDataFromLocalStorage.length > 0){
        maxBookId = Math.max.apply(Math, bookDataFromLocalStorage.map(function(b) { return b.BookId; }));
    }
    
    var bookClassId = $("#book_class_d").data("kendoDropDownList").value();
    var bookClassName = classData.find(m=>m.value==bookClassId).text;
    
    var book = {
        "BookId": maxBookId + 1,
        "BookName": $("#book_name_d").val(),
        "BookClassId": bookClassId,
        "BookClassName": bookClassName,
        "BookBoughtDate": kendo.toString($("#book_bought_date_d").data("kendoDatePicker").value(),"yyyy-MM-dd"),
        "BookStatusId": "A",
        "BookStatusName": bookStatusData.find(m=>m.StatusId=="A").StatusText,
        "BookKeeperId": "",
        "BookKeeperCname": "",
        "BookKeeperEname": "",
        "BookAuthor": $("#book_author_d").val(),
        "BookPublisher": $("#book_publisher_d").val(),
        "BookNote": $("#book_note_d").val()
    }

    bookDataFromLocalStorage.push(book);
    localStorage.setItem("bookData", JSON.stringify(bookDataFromLocalStorage));
    console.log("已將資料寫入 localStorage，目前共有 " + bookDataFromLocalStorage.length + " 筆書籍資料");
    console.log("新增的書籍資料：", book);
    
    // 重新設定 Grid 資料來源並重新整理顯示
    grid.dataSource.data(bookDataFromLocalStorage);
    grid.refresh();
    
    // 確認 Grid 是否正確顯示
    console.log("Grid 資料筆數：", grid.dataSource.data().length);
    
    $("#book_detail_area").data("kendoWindow").close();
    clear();
    
    alert("書籍新增成功！資料已儲存至瀏覽器的 localStorage。\n重新整理頁面後，資料仍會保留。");
 }

 /**
  * TODO: 更新書籍功能
  * 從表單取得修改後的資料更新書籍物件，如果借閱狀態變更為 已借出 或 已借出(未領) ，
  * 則自動新增借閱紀錄，最後更新 localStorage 和 Grid
  * 
  * @param {number|string} bookId - 要更新的書籍編號
  */
function updateBook(bookId){
    var book=bookDataFromLocalStorage.find(m=>m.BookId==bookId);
    
    if(!book) {
        alert("找不到書籍資料");
        return;
    }

    var bookClassId = $("#book_class_d").data("kendoDropDownList").value();
    var bookClassName = classData.find(m=>m.value==bookClassId).text;
    var bookStatusId = $("#book_status_d").data("kendoDropDownList").value();
    var bookStatusName = bookStatusData.find(m=>m.StatusId==bookStatusId).StatusText;
    var bookKeeperId = $("#book_keeper_d").data("kendoDropDownList").value();
    
    // 如果借閱狀態為「可以借出」（A）或「不可借出」（U），強制清空借閱人
    if(bookStatusId=="A" || bookStatusId=="U"){
        bookKeeperId = "";
    }
    
    var bookKeeper = bookKeeperId=="" ? null : memberData.find(m=>m.UserId==bookKeeperId);

    book.BookName = $("#book_name_d").val();
    book.BookClassId = bookClassId;
    book.BookClassName = bookClassName;
    book.BookBoughtDate = kendo.toString($("#book_bought_date_d").data("kendoDatePicker").value(),"yyyy-MM-dd");
    book.BookStatusId = bookStatusId;
    book.BookStatusName = bookStatusName;
    book.BookKeeperId = bookKeeperId;
    book.BookKeeperCname = bookKeeper ? bookKeeper.UserCname : "";
    book.BookKeeperEname = bookKeeper ? bookKeeper.UserEname : "";
    book.BookAuthor = $("#book_author_d").val();
    book.BookPublisher = $("#book_publisher_d").val();
    book.BookNote = $("#book_note_d").val();

    // 如果借閱狀態為 已借出（B）或已借出(未領)（C），且已選擇借閱人，則新增借閱紀錄
    if((bookStatusId=="B" || bookStatusId=="C") && bookKeeperId!=""){
        addBookLendRecord(bookId, bookKeeperId);
    }

    localStorage.setItem("bookData", JSON.stringify(bookDataFromLocalStorage));
    console.log("已將更新後的資料寫入 localStorage，目前共有 " + bookDataFromLocalStorage.length + " 筆書籍資料");

    var grid=$("#book_grid").data("kendoGrid");
    grid.dataSource.data(bookDataFromLocalStorage);
    grid.refresh();
    
    $("#book_detail_area").data("kendoWindow").close();
    clear();
 }

 /**
  * TODO: 新增借閱紀錄功能
  * 當借閱狀態變更為 已借出 或 已借出(未領) 時，自動記錄一筆借閱紀錄（包含書籍編號、借閱人資訊、借閱日期）
  * 
  * @param {number|string} bookId - 書籍編號
  * @param {string} bookKeeperId - 借閱人編號
  */
 function addBookLendRecord(bookId, bookKeeperId) {  
    var bookKeeper = memberData.find(m=>m.UserId==bookKeeperId);
    if(!bookKeeper) {
        return;
    }
    
    var today = new Date();
    var lendDate = kendo.toString(today, "yyyy-MM-dd");
    
    var lendRecord = {
        "BookId": bookId,
        "BookKeeperId": bookKeeperId,
        "BookKeeperCname": bookKeeper.UserCname,
        "BookKeeperEname": bookKeeper.UserEname,
        "LendDate": lendDate
    };
    
    bookLendDataFromLocalStorage.push(lendRecord);
    localStorage.setItem("lendData", JSON.stringify(bookLendDataFromLocalStorage));
 }

/**
 * TODO: 查詢書籍功能
 * 根據查詢條件篩選書籍：書名使用模糊查詢 contains，其他欄位使用完全匹配 eq，
 * 所有條件使用 AND 邏輯組合
 */
function queryBook(){
    var grid=getBooGrid();

    var bookName = $("#book_name_q").val() || "";
    var bookClassId = $("#book_class_q").data("kendoDropDownList").value() || "";
    var bookKeeperId = $("#book_keeper_q").data("kendoDropDownList").value() || "";
    var bookStatusId = $("#book_status_q").data("kendoDropDownList").value() || "";

    var filtersCondition=[];
    
    if(bookName!=""){
        filtersCondition.push({ field: "BookName", operator: "contains", value: bookName });
    }
    
    if(bookClassId!=""){
        filtersCondition.push({ field: "BookClassId", operator: "eq", value: bookClassId });
    }
    
    if(bookKeeperId!=""){
        filtersCondition.push({ field: "BookKeeperId", operator: "eq", value: bookKeeperId });
    }
    
    if(bookStatusId!=""){
        filtersCondition.push({ field: "BookStatusId", operator: "eq", value: bookStatusId });
    }

    if(filtersCondition.length > 0){
        grid.dataSource.filter({
            logic: "and",
            filters: filtersCondition
        });
    } else {
        grid.dataSource.filter({});
    }
}

/**
 * TODO: 刪除書籍功能
 * 檢查書籍是否已借出，已借出的書籍不能刪除，未借出的書籍則從資料陣列移除並更新 localStorage 和 Grid
 * 
 * @param {Event} e - 點擊事件物件
 */
function deleteBook(e) {
    var grid = $("#book_grid").data("kendoGrid");    
    var row = grid.dataItem(e.target.closest("tr"));
    
    // 檢查是否已借出（狀態為 "B" 或 "C"）
    if(row.BookStatusId == "B" || row.BookStatusId == "C"){
        alert("無法刪除已借出的書籍");
        return;
    }
    
    var index = bookDataFromLocalStorage.findIndex(m => m.BookId == row.BookId);
    if(index > -1){
        bookDataFromLocalStorage.splice(index, 1);
    }
    
    localStorage.setItem("bookData", JSON.stringify(bookDataFromLocalStorage));
    
    grid.dataSource.data(bookDataFromLocalStorage);
    grid.refresh();
    
    alert("刪除成功");
}


/**
 * 顯示圖書編輯畫面 修改
 * 
 * @param {Event} e - 點擊事件物件
 */
function showBookForUpdate(e) {
    e.preventDefault();

    state=stateOption.update;
    $("#book_detail_area").data("kendoWindow").title("修改書籍");
    $("#btn-save").css("display","");

    var grid = getBooGrid();
    var bookId = grid.dataItem(e.target.closest("tr")).BookId;

    bindBook(bookId);
    
    $("#book_class_d").data("kendoDropDownList").enable(true);
    $("#book_name_d").prop("disabled", false);
    $("#book_author_d").prop("disabled", false);
    $("#book_publisher_d").prop("disabled", false);
    $("#book_bought_date_d").data("kendoDatePicker").enable(true);
    $("#book_status_d").data("kendoDropDownList").enable(true);
    $("#book_note_d").prop("disabled", false);
    
    setStatusKeepRelation();
    $("#book_detail_area").data("kendoWindow").open();
}

/**
 * TODO: 顯示圖書明細畫面 唯讀
 * 將書籍資料繫結到表單並設定所有欄位為唯讀，隱藏存檔按鈕
 * 
 * @param {Event} e - 點擊事件物件
 * @param {number|string} bookId - 要顯示的書籍編號
 */
function showBookForDetail(e,bookId) {
    e.preventDefault();
    
    state = "";
    $("#book_detail_area").data("kendoWindow").title("書籍明細");
    $("#btn-save").css("display","none");
    
    bindBook(bookId);
    
    $("#book_class_d").data("kendoDropDownList").enable(false);
    $("#book_name_d").prop("disabled", true);
    $("#book_author_d").prop("disabled", true);
    $("#book_publisher_d").prop("disabled", true);
    $("#book_bought_date_d").data("kendoDatePicker").enable(false);
    $("#book_status_d").data("kendoDropDownList").enable(false);
    $("#book_keeper_d").data("kendoDropDownList").enable(false);
    $("#book_note_d").prop("disabled", true);
    
    $("#book_detail_area").data("kendoWindow").open();
}

/**
 * TODO: 繫結圖書資料到表單欄位
 * 根據書籍編號找出對應的書籍資料 將資料填入表單各欄位
 * 
 * @param {number|string} bookId - 要繫結的書籍編號
 */
function bindBook(bookId){
    var book = bookDataFromLocalStorage.find(m => m.BookId == bookId);
    if(!book) {
        return;
    }
    
    $("#book_id_d").val(bookId);
    $("#book_name_d").val(book.BookName);
    $("#book_author_d").val(book.BookAuthor);
    $("#book_publisher_d").val(book.BookPublisher);
    $("#book_note_d").val(book.BookNote);
    
    $("#book_class_d").data("kendoDropDownList").value(book.BookClassId);
    onChange(); // 更新圖片
    
    if(book.BookBoughtDate){
        var boughtDate = kendo.parseDate(book.BookBoughtDate, "yyyy-MM-dd");
        if (boughtDate) {
            $("#book_bought_date_d").data("kendoDatePicker").value(boughtDate);
        } else {
            console.log("日期解析失敗：", book.BookBoughtDate);
        }
    }
    
    if(book.BookStatusId){
        $("#book_status_d").data("kendoDropDownList").value(book.BookStatusId);
    }
    
    if(book.BookKeeperId){
        $("#book_keeper_d").data("kendoDropDownList").value(book.BookKeeperId);
    } else {
        $("#book_keeper_d").data("kendoDropDownList").value("");
    }
}

/**
 * TODO: 顯示書籍借閱紀錄
 * 從借閱紀錄陣列中篩選出該書籍的所有借閱紀錄 依借閱日期降冪排序後顯示在 Grid 中
 * 
 * @param {Event} e - 點擊事件物件
 */
function showBookLendRecord(e) {
    var grid = getBooGrid();
    var dataItem = grid.dataItem(e.target.closest("tr"));
    
    // 篩選出該書籍的所有借閱紀錄
    var bookLendRecordData = bookLendDataFromLocalStorage.filter(function(record){
        return record.BookId == dataItem.BookId;
    });
    
    // 依借閱日期降冪排序（最新的在前）
    bookLendRecordData.sort(function(a, b){
        return new Date(b.LendDate) - new Date(a.LendDate);
    });
    
    $("#book_record_grid").data("kendoGrid").dataSource.data(bookLendRecordData);
    $("#book_record_area").data("kendoWindow").title(dataItem.BookName + " - 借閱紀錄").open();
}

/**
 * TODO: 清空畫面功能
 * 清空所有查詢條件和表單欄位，重置所有欄位為預設值並啟用所有欄位
 * 
 * @param {string} area - 保留參數，目前未使用
 */
function clear(area) {
    // 清空查詢條件
    $("#book_name_q").val("");
    $("#book_class_q").data("kendoDropDownList").value("");
    $("#book_keeper_q").data("kendoDropDownList").value("");
    $("#book_status_q").data("kendoDropDownList").value("");
    
    // 清空詳細資料表單
    $("#book_id_d").val("");
    $("#book_name_d").val("");
    $("#book_author_d").val("");
    $("#book_publisher_d").val("");
    $("#book_note_d").val("");
    $("#book_class_d").data("kendoDropDownList").value("");
    $("#book_bought_date_d").data("kendoDatePicker").value(new Date());
    $("#book_status_d").data("kendoDropDownList").value("");
    $("#book_keeper_d").data("kendoDropDownList").value("");
    $("#book_image_d").attr("src", "image/optional.jpg");
    
    // 啟用所有欄位
    $("#book_class_d").data("kendoDropDownList").enable(true);
    $("#book_name_d").prop("disabled", false);
    $("#book_author_d").prop("disabled", false);
    $("#book_publisher_d").prop("disabled", false);
    $("#book_bought_date_d").data("kendoDatePicker").enable(true);
    $("#book_status_d").data("kendoDropDownList").enable(true);
    $("#book_keeper_d").data("kendoDropDownList").enable(true);
    $("#book_note_d").prop("disabled", false);
}

/**
 * TODO: 設定借閱狀態與借閱人欄位的關聯規則
 * 新增模式：隱藏借閱狀態和借閱人欄位，預設借閱狀態為「可以借出」
 * 修改模式：根據借閱狀態決定借閱人欄位是否必填和是否可編輯
 *   - 可以借出（A）或不可借出（U）：借閱人不必填且禁用
 *   - 已借出（B）或已借出(未領)（C）：借閱人必填且啟用
 */
function setStatusKeepRelation() { 
    switch (state) {
        case "add":
            $("#book_status_d_col").css("display","none");
            $("#book_keeper_d_col").css("display","none");
            $("#book_status_d").prop('required',false);
            $("#book_keeper_d").prop('required',false);
            $("#book_status_d").data("kendoDropDownList").value("A");
            $("#book_keeper_d").data("kendoDropDownList").value("");
            $("#book_keeper_d").data("kendoDropDownList").enable(false);
            break;
        case "update":
            $("#book_status_d_col").css("display","");
            $("#book_keeper_d_col").css("display","");
            $("#book_status_d").prop('required',true);

            var bookStatusId = $("#book_status_d").data("kendoDropDownList").value();

            if(bookStatusId=="A" || bookStatusId=="U"){
                $("#book_keeper_d").prop('required',false);
                $("#book_keeper_d").data("kendoDropDownList").enable(false);
                $("#book_keeper_d").data("kendoDropDownList").value("");
                
                var validator = $("#book_detail_area").data("kendoValidator");
                if(validator){
                    validator.validateInput($("#book_keeper_d"));
                }
            } else {
                $("#book_keeper_d").prop('required',true);
                $("#book_keeper_d").data("kendoDropDownList").enable(true);
            }
            break;
        default:
            $("#book_status_d_col").css("display","");
            $("#book_keeper_d_col").css("display","");
            break;
    }
 }

/**
 * 初始化畫面所需的所有 Kendo UI 控制項 下拉選單、日期選擇器等
 */
function registerRegularComponent(){
    /**
     * 查詢區域 - 圖書類別下拉選單
     * 資料來源：classData（來自 code-data.js）
     * 顯示欄位：text 類別名稱
     * 值欄位：value 類別代碼
     */
    $("#book_class_q").kendoDropDownList({
        dataTextField: "text",
        dataValueField: "value",
        dataSource: classData,
        optionLabel: "請選擇",
        index: 0
    });

    /**
     * 詳細資料表單 - 圖書類別下拉選單
     * 綁定 change 事件：當選擇變更時，自動更新對應的類別圖片
     */
    $("#book_class_d").kendoDropDownList({
        dataTextField: "text",
        dataValueField: "value",
        dataSource: classData,
        optionLabel: "請選擇",
        index: 0,
        change: onChange  // 選擇變更時更新圖片
    });

    /**
     * 查詢區域 - 借閱人下拉選單
     * 資料來源：memberData 
     * 顯示欄位：UserCname 中文姓名
     * 值欄位：UserId 使用者編號
     */
    $("#book_keeper_q").kendoDropDownList({
        dataTextField: "UserCname",
        dataValueField: "UserId",
        dataSource: memberData,
        optionLabel: "請選擇",
        index: 0
    });

    /**
     * 詳細資料表單 - 借閱人下拉選單
     * 資料來源：memberData
     */
    $("#book_keeper_d").kendoDropDownList({
        dataTextField: "UserCname",
        dataValueField: "UserId",
        dataSource: memberData,
        optionLabel: "請選擇",
        index: 0
    });

    /**
     * 查詢區域 - 借閱狀態下拉選單
     * 資料來源：bookStatusData
     * 顯示欄位：StatusText 狀態文字
     * 值欄位：StatusId 狀態代碼
     */
    $("#book_status_q").kendoDropDownList({
        dataTextField: "StatusText",
        dataValueField: "StatusId",
        dataSource: bookStatusData,
        optionLabel: "請選擇",
        index: 0
    });

    /**
     * 詳細資料表單 - 借閱狀態下拉選單
     * 綁定 change 事件 當借閱狀態變更時，自動調整借閱人欄位的顯示和驗證規則
     */
    $("#book_status_d").kendoDropDownList({
        dataTextField: "StatusText",
        dataValueField: "StatusId",
        dataSource: bookStatusData,
        optionLabel: "請選擇",
        change:setStatusKeepRelation,  // 狀態變更時更新借閱人欄位規則
        index: 0
    });

    /**
     * 詳細資料表單 - 購買日期選擇器
     * 預設值：今天
     * 格式：yyyy-MM-dd（例如：2025-12-16）
     */
    $("#book_bought_date_d").kendoDatePicker({
        value: new Date(),
        format: "yyyy-MM-dd",
        parseFormats: ["yyyy-MM-dd", "yyyy/MM/dd"],
        change: function(e) {
            // 驗證日期是否合法
            var datePicker = this;
            var selectedDate = datePicker.value();
            var input = $("#book_bought_date_d");
            var validator = $("#book_detail_area").data("kendoValidator");
            
            if (selectedDate) {
                try {
                    // 檢查日期是否為有效日期
                    var dateStr = kendo.toString(selectedDate, "yyyy-MM-dd");
                    var parsedDate = kendo.parseDate(dateStr, "yyyy-MM-dd");
                    
                    if (!parsedDate || isNaN(parsedDate.getTime())) {
                        alert("日期異常請重新填寫");
                        datePicker.value(new Date()); // 重置為今天
                        // 觸發驗證以顯示錯誤訊息
                        if (validator) {
                            validator.validateInput(input);
                        }
                        return;
                    }
                    // 日期合法，清除驗證錯誤
                    if (validator) {
                        validator.validateInput(input);
                    }
                } catch (error) {
                    alert("日期異常請重新填寫");
                    datePicker.value(new Date()); // 重置為今天
                    // 觸發驗證以顯示錯誤訊息
                    if (validator) {
                        validator.validateInput(input);
                    }
                }
            } else {
                // 日期為空，觸發驗證以顯示錯誤訊息
                if (validator) {
                    validator.validateInput(input);
                }
            }
        }
    });
}

/**
 * 統一建立 Kendo Window 的函數
 * 避免重複代碼，方便後續維護
 * 
 * @param {string} selector - jQuery 選擇器字串
 * @param {Object} options - Window 設定選項
 * @param {string} options.width - 視窗寬度
 * @param {string} options.title - 視窗標題
 * @param {boolean} [options.visible=false] - 是否可見
 * @param {boolean} [options.modal=true] - 是否為模態視窗
 * @param {Array} [options.actions=["Close"]] - 視窗動作按鈕
 */
function createKendoWindow(selector, options) {
    var defaultOptions = {
        visible: false,
        modal: true,
        actions: ["Close"]
    };
    
    var windowOptions = $.extend({}, defaultOptions, options);
    
    $(selector).kendoWindow(windowOptions).data("kendoWindow").center();
}

/**
 * 取得畫面上的書籍 Grid 物件
 * 
 * @returns {kendo.ui.Grid} Kendo Grid 物件實例
 */
function getBooGrid(){
    return $("#book_grid").data("kendoGrid");
}