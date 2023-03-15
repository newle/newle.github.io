const loginBtn = document.getElementById('login-btn');
const loginBox = document.querySelector('.login-box');

loginBtn.addEventListener('click', () => {
	// 创建一个烟花效果的div
	const firework = document.createElement('div');
	firework.classList.add('firework');
	loginBox.appendChild(firework);

	// 设置烟花的动画
	anime({
		targets: firework,
		scale: [0, 1.2],
		opacity: [1, 0],
		easing: 'easeInOutQuad',
		duration: 1000,
		loop: false,
		complete: function(anim) {
			loginBox.removeChild(firework);
		}
	});
});

