let jsonData;
let commentsMap = new Map();
let votesMap = new Map();
let totalComments = 0;
const whitespaceRegex = /^\s*$/;
const currentUser = {
    currentUsername: null,
    currentUserPfp: null
};
const elements = {
    commentsList: document.querySelector(".comments-list"),
    addCommentInput: document.querySelector(".add-comment textarea"),
    blackLayer: document.querySelector(".black-layer")
};
const btns = {
    sendComment: document.querySelector(".add-comment button")
};
async function fetchData(link) {
    const response = await fetch(link);
    return await response.json();
}

//main

fetchData("./data.json").then((data) => {
    jsonData = data;
    currentUser.currentUsername = jsonData.currentUser.username;
    currentUser.currentUserPfp = jsonData.currentUser.image.png;
    document.querySelector(".add-comment .pfp img").setAttribute("src", currentUser.currentUserPfp);
    loadComments(jsonData.comments);
    return jsonData
},
    () => {
        elements.commentsList.appendChild(document.createTextNode("Error 404, please try again later :)"))
        throw new Error("data not found, error fetching the data");
    }
)
    .then((data) => {
        elements.commentsList.addEventListener("click", (event) => {
            const button = event.target.closest("[role='button'], button");
            if (!button) {
                return;
            }
            if (button.classList.contains("reply")) {
                addReply({ currentTarget: button });
            }
            if (button.classList.contains("edit")) {
                editComment({ currentTarget: button });
            }
            if (button.classList.contains("delete")) {
                showDeleteConfirm({ currentTarget: button });
            }
        });
        elements.commentsList.addEventListener("keydown", (event) => {
            if (event.code != "Enter") return;
            event.preventDefault();
            const button = event.target.closest("[role='button'], button");
            if (!button) {
                return;
            }
            if (button.classList.contains("reply")) {
                addReply({ currentTarget: button });
            }
            if (button.classList.contains("edit")) {
                editComment({ currentTarget: button });
            }
            if (button.classList.contains("delete")) {
                showDeleteConfirm({ currentTarget: button });
            }
        });

        btns.sendComment.addEventListener("click", () => {
            addComment("comment", elements.commentsList, elements.addCommentInput);
        });
        elements.addCommentInput.addEventListener("keydown", (e) => {
            if (e.code == "Enter") {
                addComment("comment", elements.commentsList, elements.addCommentInput);
                e.preventDefault();
            }
        })
    });

//end main

function loadComments(commentList, parentElement = elements.commentsList) {
    for (const comment of commentList) {
        const type = comment.replyingTo ? "reply" : "comment";
        const newElement = createComment(
            type,
            comment.id,
            comment.user.username,
            comment.score,
            comment.user.image.png,
            comment.createdAt,
            comment.content,
            comment.replies.length,
            parentElement
        );

        if (comment.replies.length > 0) {
            loadComments(comment.replies, newElement);
        }
    }
}
function createComment(type, commentId = totalComments + 1, commentUsername, commentScore, commentPfp, commentCreatedAt, commentContent, commentRepliesCount, parentCommentElement) {
    const htmlString = `
        <div class="comment" data-id=${commentId} data-username=${commentUsername}>
            <div class="comment-box d-flex">
              <div class="vote d-flex">
                <button class="up-vote"><img src="/images/icon-plus.svg" alt=""></button>
                <div class="vote-quantity" data-score=${commentScore}>${commentScore}</div>
                <button class="down-vote"><img src="/images/icon-minus.svg" alt=""></button>
              </div>
              <div class="comment-about">
                <div class="comment-info d-flex">
                  <div class="pfp" role="button" tabindex="0"><img src=${commentPfp} alt=""></div>
                  <div class="username" role="button" data-username=${commentUsername}>${commentUsername}</div>
                  <div class="create-time" data-create-time=${commentCreatedAt}>${commentCreatedAt}</div>
                  <div class="comment-toolbox d-flex">
                  </div>
                </div>
                <div class="comment-content">${commentContent}</div>
              </div>
            </div>
        </div>`;
    let newCommentElement;
    if (type == "comment") {
        elements.commentsList.insertAdjacentHTML("beforeend", htmlString);
        newCommentElement = elements.commentsList.lastElementChild;
        elements.commentsList.scroll(0, elements.commentsList.scrollHeight)
    } else {
        parentCommentElement.querySelector(".replies-list").insertAdjacentHTML("beforeend", htmlString);
        newCommentElement = parentCommentElement.querySelector(".replies-list").lastElementChild;
    }
    //activate votes
    newCommentElement.querySelector(".up-vote").addEventListener("click", addVote);
    newCommentElement.querySelector(".up-vote").addEventListener("keydown", keyboardAddVote)
    newCommentElement.querySelector(".down-vote").addEventListener("click", addVote);
    newCommentElement.querySelector(".down-vote").addEventListener("keydown", keyboardAddVote)
        //create a replies' container inside the comment
    if (commentRepliesCount > 0) {
        const repliesList = document.createElement("div");
        repliesList.classList.add("replies-list");
        repliesList.setAttribute("data-replies-count", commentRepliesCount);
        newCommentElement.insertAdjacentElement("beforeend", repliesList);
    }
    //add "you" tag
    if (commentUsername == currentUser.currentUsername) {
        const youTag = document.createElement("span");
        youTag.appendChild(document.createTextNode("you"));
        youTag.classList.add("you");
        const newCommentinfo = newCommentElement.querySelector(".comment-info");
        newCommentinfo.insertBefore(youTag, newCommentinfo.querySelector(".create-time"));
    }
    adjustCommentToolbox(newCommentElement, commentUsername);
    votesMap.set(commentId, commentScore);
    commentsMap.set(commentId, newCommentElement);
    totalComments++;

    return newCommentElement;
}
function adjustCommentToolbox(comment, commentUsername) {
    if (commentUsername == currentUser.currentUsername) {
        comment.querySelector(".comment-toolbox").insertAdjacentHTML("beforeend", `
            <div class="delete d-flex" role="button" tabindex="0">
                <img src="/images/icon-delete.svg" alt="">
                <span class="delete">delete</span>
            </div>
            <div class="edit d-flex" role="button" tabindex="0">
              <img src="/images/icon-edit.svg" alt="">
              <span class="edit">edit</span>
            </div>`);
    } else {
        comment.querySelector(".comment-toolbox").insertAdjacentHTML("beforeend", `
            <div class="reply d-flex" role="button" tabindex="0">
                <img src="/images/icon-reply.svg" alt="">
                <span class="reply">reply</span>
            </div>`);
    }
}
function addComment(type, parent, inputBox = elements.addCommentInput) {
    const commentContent = inputBox.value || "";
    if (whitespaceRegex.test(commentContent)) {
        return false;
    }
    createComment(
        type,
        undefined,
        currentUser.currentUsername,
        0,
        currentUser.currentUserPfp,
        "Just Now",
        commentContent,
        0,
        parent,
    );
    //adjust replies count for the parent comment
    updateRepliesCount(parent);
    elements.addCommentInput.value = "";
    elements.addCommentInput.blur();
    return true;
}
function updateRepliesCount(container) {
    if (container.contains(container.querySelector(".replies-list"))) {
        const repliesCount = container.querySelectorAll(".replies-list .comment").length;
        container.querySelector(".replies-list").setAttribute("data-replies-count", repliesCount);
    }
}
function addReply(event) {
    //start setting adding reply enviorment
    const repliedToComment = event.currentTarget.closest(".comment");
    const repliedToCommentContainer = repliedToComment.parentElement;
    //deactivating the reply button
    repliedToComment.querySelector(".comment-toolbox > div.reply").classList.add("unactive");
    //implementing reply input
    const replyInputBox = document.createElement("div");
    replyInputBox.classList.add("add-comment", "d-flex");
    replyInputBox.innerHTML = `
     <div class="pfp">
       <img src="/images/avatars/image-juliusomo.png" alt="">
     </div>
     <textarea placeholder="Add a reply..">@${repliedToComment.getAttribute("data-username")}</textarea>
     <button class="send">Reply</button>`;

    //adjust reply input box
    const replyInput = replyInputBox.querySelector("textarea");
    repliedToCommentContainer.insertBefore(replyInputBox, repliedToComment.nextSibling);
    replyInput.value = `@${repliedToComment.getAttribute("data-username")} `
    replyInput.setSelectionRange(replyInput.value.length, replyInput.value.length);
    autoResize(replyInput);
    replyInput.addEventListener("input", () => autoResize(replyInput));
    replyInput.focus();

    //create reply list if the comment don't have replies
    if (!repliedToComment.contains(repliedToComment.querySelector(".replies-list"))) {
        const repliesList = document.createElement("div");
        repliesList.classList.add("replies-list");
        repliedToComment.insertAdjacentElement("beforeend", repliesList);
    }
    //end setting adding reply enviorment
    replyInputBox.querySelector("button").addEventListener("click", () => {
        if (addComment("reply", repliedToComment, replyInputBox.querySelector("textarea"))) {
            removeReplyInputBox(repliedToComment, repliedToCommentContainer, replyInputBox);
        }
    });
    replyInputBox.querySelector("textarea").addEventListener("keydown", (e) => {
        if (e.key == "Enter") {
            e.preventDefault();
            if (addComment("reply", repliedToComment, replyInputBox.querySelector("textarea"))) {
                removeReplyInputBox(repliedToComment, repliedToCommentContainer, replyInputBox);
            }
        }
    });
    setTimeout(() => {
        window.addEventListener("click", window.unfocusReply = (e) => {
            if (e.target.closest(".add-comment") != replyInputBox) {
                removeReplyInputBox(repliedToComment, repliedToCommentContainer, replyInputBox);
            }
        })
        window.addEventListener("keydown", window.unfocusReplyByEsc = (e) => {
            if (e.code == "Escape") {
                e.preventDefault();
                removeReplyInputBox(repliedToComment, repliedToCommentContainer, replyInputBox);
                window.removeEventListener("keydown", window.unfocusReplyByEsc);
            }
        })
    }, 100);
}
function removeReplyInputBox(comment, commentContainer, inputBox) {
    commentContainer.removeChild(inputBox);
    comment.querySelector(".comment-toolbox > div.reply").classList.remove("unactive");
    window.removeEventListener("click", window.unfocusReply);
}
function showDeleteConfirm(event) {
    document.body.insertAdjacentHTML("afterbegin", `
        <div class="confirm-delete p-absolute">
        <h4>Delete Comment</h4>
        <p>Are you sure you want to delete this comment? This will remove the comment and it can't be undone.</p>
        <div class="confirm-buttons d-flex">
        <button class="cancel">No, Cancel</button>
        <button class="confirm">Yes, Delete</button>
        </div>
        </div>`);
    elements.blackLayer.classList.remove("hidden");
    document.body.classList.add("no-scroll");
    const confirmButton = document.querySelector(".confirm-delete button.confirm");
    const cancelButton = document.querySelector(".confirm-delete button.cancel");
    cancelButton.focus();
    confirmButton.addEventListener("click", () => {
        deleteComment(event, true)
    });
    confirmButton.addEventListener("keydown", (e) => {
        if (e.code == "Enter") {
            deleteComment(event, true)
        }
    });
    cancelButton.addEventListener("click", () => {
        deleteComment(event, false);
        return;
    });
    cancelButton.addEventListener("keydown", (e) => {
        if (e.code == "Enter") {
            deleteComment(event, true)
        }
    });
}
function deleteComment(event, confirmed) {
    if (confirmed) {
        const deletedComment = event.currentTarget.closest(".comment");
        const deleteCommentId = +deletedComment.getAttribute("data-id");
        const deletedCommentContainer = deletedComment.parentElement;
        deletedCommentContainer.removeChild(deletedComment);
        commentsMap.delete(deleteCommentId);
        if (deletedCommentContainer != elements.commentsList) {
            //adjust the replies list for the deleted comment's parent
            let containerRepliesCount = deletedCommentContainer.getAttribute("data-replies-count");
            deletedCommentContainer.setAttribute("data-replies-count", --containerRepliesCount);
            if (containerRepliesCount == 0) {
                deletedCommentContainer.parentElement.removeChild(deletedCommentContainer);
            }
        }
    }
    elements.blackLayer.classList.add("hidden");
    document.body.removeChild(document.querySelector(".confirm-delete"));
    document.body.classList.remove("no-scroll")
}
function editComment(event) {
    let submitEdit;
    //start setting edit comment enviroment
    const editedComment = event.currentTarget.closest(".comment");
    const editedCommentContentContainer = editedComment.querySelector(".comment-content")
    let commentContent = editedCommentContentContainer.innerText;
    const editInput = document.createElement("textarea");
    const editButtonContainer = document.createElement("div");
    editButtonContainer.classList.add("center-flex");
    const editButton = document.createElement("button");
    editButton.classList.add("send", "submit-edit");
    editButton.innerText = "Edit"
    editButtonContainer.appendChild(editButton);

    editInput.value = commentContent;
    //deactivating reply and delete buttons
    editedComment.querySelectorAll(".comment-toolbox > div").forEach(button => {
        button.classList.add("unactive");
    });
    //deactivating votes
    editedComment.querySelectorAll(".vote > button").forEach(button => {
        button.classList.add("unactive");
    })
    editedComment.querySelector(".comment-about").removeChild(editedCommentContentContainer);
    editedComment.querySelector(".comment-about").appendChild(editInput);
    autoResize(editInput);
    editInput.addEventListener("input", () => autoResize(editInput));
    editInput.focus();
    editedComment.querySelector(".comment-box").appendChild(editButtonContainer);
    //end setting edit comment enviroment
    editButton.addEventListener("click", submitEdit = () => {
        const newCommentContent = editInput.value;
        if (newCommentContent == commentContent || whitespaceRegex.test(newCommentContent)) {
            return;
        }
        editedCommentContentContainer.innerText = newCommentContent;
        closeEditField(editedComment, editInput, editButtonContainer, editedCommentContentContainer);
    });
    editInput.addEventListener("keydown", (e) => {
        if (e.key == "Enter") {
            e.preventDefault();
            submitEdit();
        }
    });
    setTimeout(() => {
        window.addEventListener("click", window.unfocusEdit = (e) => {
            if (e.target.closest(".comment") != editedComment) {
                closeEditField(editedComment, editInput, editButtonContainer, editedCommentContentContainer);
                window.removeEventListener("click", window.unfocusEdit);
            }
        })
        window.addEventListener("keydown", window.unfocusEditByEsc = (e) => {
            if (e.code == "Escape") {
                e.preventDefault();
                closeEditField(editedComment, editInput, editButtonContainer, editedCommentContentContainer);
                window.removeEventListener("keydown", window.unfocusEditByEsc);
            }
        })
    }, 100);
}
function autoResize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + 15 + "px";
}
function closeEditField(comment, editInput, replyButtonContainer, commentContentContainer) {
    comment.querySelector(".comment-about").removeChild(editInput);
    comment.querySelector(".comment-box").removeChild(replyButtonContainer);
    comment.querySelector(".comment-about").appendChild(commentContentContainer);
    comment.querySelectorAll(".comment-toolbox > div").forEach((e) => {
        e.classList.remove("unactive");
    });
    comment.querySelectorAll(".vote > button").forEach(button => {
        button.classList.remove("unactive");
    })
    window.removeEventListener("click", window.unfocusEdit);
}
function addVote(event) {
    const id = +event.currentTarget.closest(".comment").getAttribute("data-id");
    const vote = event.currentTarget.closest(".vote");
    const scoreELement = vote.querySelector(".vote-quantity");
    let currentScore = +scoreELement.getAttribute("data-score")
    if (event.currentTarget.classList.contains("up-vote")) {
        scoreELement.setAttribute("data-score", ++currentScore);
    } else {
        scoreELement.setAttribute("data-score", --currentScore);
    }
    scoreELement.innerText = currentScore;
    if (currentScore == votesMap.get(id)) {
        vote.querySelector(".down-vote").addEventListener("click", addVote);
        vote.querySelector(".down-vote").addEventListener("keydown", keyboardAddVote);
        vote.querySelector(".up-vote").addEventListener("click", addVote);
        vote.querySelector(".up-vote").addEventListener("keydown", keyboardAddVote);
        return;
    }
    event.currentTarget.removeEventListener("click", addVote);
    event.currentTarget.removeEventListener("keydown", keyboardAddVote);
}
function keyboardAddVote(event) {
    if (event.code == "Enter") {
        addVote(event);
    }
}